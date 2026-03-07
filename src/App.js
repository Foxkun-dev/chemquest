/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";


// ─── SOUND ENGINE v2 — Cinematic Web Audio ───────────────────────────────────
const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
let _actx = null;
function getACtx() {
  if (!_actx && AudioCtx) _actx = new AudioCtx();
  return _actx;
}

function playSound(type) {
  const ctx = getACtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const t = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.75;
  master.connect(ctx.destination);

  // ── Reverb (convolver giả bằng delay) ────────────────────────────────────
  function makeReverb(wet=0.25) {
    const delay = ctx.createDelay(0.5);
    const fb = ctx.createGain();
    const mix = ctx.createGain();
    delay.delayTime.value = 0.08;
    fb.gain.value = 0.4;
    mix.gain.value = wet;
    delay.connect(fb); fb.connect(delay); delay.connect(mix); mix.connect(master);
    return delay;
  }

  // ── Oscillator với envelope đẹp ──────────────────────────────────────────
  function tone(freq, startT, dur, wave="sine", vol=0.3, attack=0.01, release=0.85) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(master);
    o.type = wave;
    o.frequency.setValueAtTime(freq, startT);
    g.gain.setValueAtTime(0, startT);
    g.gain.linearRampToValueAtTime(vol, startT + attack);
    g.gain.setValueAtTime(vol, startT + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, startT + dur * release);
    o.start(startT); o.stop(startT + dur + 0.05);
  }

  // ── Pitch sweep (freq ramp) ───────────────────────────────────────────────
  function sweep(f1, f2, startT, dur, wave="sine", vol=0.25) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(master);
    o.type = wave;
    o.frequency.setValueAtTime(f1, startT);
    o.frequency.exponentialRampToValueAtTime(f2, startT + dur);
    g.gain.setValueAtTime(vol, startT);
    g.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
    o.start(startT); o.stop(startT + dur + 0.02);
  }

  // ── Noise burst với filter ────────────────────────────────────────────────
  function burst(startT, dur, freq=1000, q=1.5, vol=0.12, type="bandpass") {
    const samples = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = type; filt.frequency.value = freq; filt.Q.value = q;
    const g = ctx.createGain();
    src.connect(filt); filt.connect(g); g.connect(master);
    g.gain.setValueAtTime(vol, startT);
    g.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
    src.start(startT); src.stop(startT + dur);
  }

  // ── Chord (nhiều nốt cùng lúc) ───────────────────────────────────────────
  function chord(freqs, startT, dur, wave="sine", vol=0.18) {
    freqs.forEach(f => tone(f, startT, dur, wave, vol));
  }

  switch(type) {

    // ── CLICK — Mechanical keyboard feel ─────────────────────────────────────
    case "click":
      burst(t, 0.015, 3000, 8, 0.18, "highpass");
      tone(1200, t, 0.04, "square", 0.08, 0.001, 0.9);
      sweep(600, 300, t+0.01, 0.05, "square", 0.06);
      break;

    // ── CORRECT — Arcade "ding-ding-ding" + shimmer ───────────────────────────
    case "correct": {
      const rv = makeReverb(0.2);
      // Giai điệu 4 nốt vui
      const melody = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      melody.forEach((f, i) => {
        tone(f, t + i*0.1, 0.25, "triangle", 0.35, 0.01);
        tone(f*2, t + i*0.1 + 0.02, 0.12, "sine", 0.08, 0.005); // harmonic
      });
      // Shimmer cao
      [2093, 2637].forEach(f => tone(f, t+0.38, 0.4, "sine", 0.06, 0.02));
      burst(t+0.35, 0.25, 4000, 2, 0.06, "highpass");
      // Bass pulse nhẹ
      sweep(80, 60, t, 0.15, "sine", 0.2);
      break;
    }

    // ── WRONG — Cyberpunk "bzzt" + descend ───────────────────────────────────
    case "wrong": {
      // Tiếng điện tử bị lỗi
      sweep(400, 180, t, 0.08, "sawtooth", 0.3);
      sweep(350, 120, t+0.06, 0.12, "sawtooth", 0.25);
      // Glitch burst
      burst(t, 0.06, 500, 3, 0.2, "lowpass");
      burst(t+0.05, 0.08, 200, 5, 0.15, "lowpass");
      // Cuối: tiếng rơi
      sweep(220, 80, t+0.12, 0.3, "sine", 0.2);
      // Distortion feel
      tone(110, t+0.15, 0.4, "sawtooth", 0.12, 0.005);
      break;
    }

    // ── TIMEOUT — Alarm + tension ─────────────────────────────────────────────
    case "timeout": {
      // 3 tiếng beep nhanh rồi đổ xuống
      [0, 0.18, 0.36].forEach(d => {
        tone(880, t+d, 0.12, "square", 0.22, 0.005, 0.9);
        tone(1760, t+d+0.01, 0.08, "sine", 0.06, 0.001);
      });
      // Đổ xuống dramatic
      sweep(440, 55, t+0.5, 0.6, "sawtooth", 0.28);
      sweep(330, 40, t+0.55, 0.55, "sine", 0.15);
      burst(t+0.48, 0.4, 300, 2, 0.15, "lowpass");
      break;
    }

    // ── STREAK 3 — Neon power-up bắt đầu ────────────────────────────────────
    case "streak3": {
      const rv = makeReverb(0.15);
      // Arpeggio điện tử lên nhanh
      [330, 415, 523, 659].forEach((f, i) => {
        tone(f, t + i*0.055, 0.14, "square", 0.22, 0.005);
        tone(f*2, t + i*0.055, 0.08, "sine", 0.06, 0.002);
      });
      // Chốt: nốt sáng
      tone(880, t+0.25, 0.45, "triangle", 0.3, 0.01);
      sweep(1760, 1320, t+0.28, 0.35, "sine", 0.08);
      burst(t+0.2, 0.3, 3000, 3, 0.07, "highpass");
      break;
    }

    // ── STREAK 5 — Cyber fanfare rõ ràng ─────────────────────────────────────
    case "streak5": {
      makeReverb(0.25);
      // Fanfare 6 nốt — mỗi nốt có harmonic
      const notes5 = [392, 494, 587, 698, 880, 1047];
      notes5.forEach((f, i) => {
        const s = t + i*0.07;
        tone(f,   s, 0.22, "triangle", 0.28, 0.008);
        tone(f*1.5, s+0.01, 0.14, "sine", 0.09, 0.005);
      });
      // Chord cuối đẹp: G major trải
      chord([392, 494, 587, 784], t+0.5, 0.7, "triangle", 0.14);
      sweep(2000, 3000, t+0.55, 0.3, "sine", 0.06);
      burst(t+0.45, 0.4, 5000, 2, 0.08, "highpass");
      // Bass boom
      sweep(55, 80, t, 0.2, "sine", 0.3);
      break;
    }

    // ── STREAK 10 — INFERNO: orchestral hit + full fanfare ───────────────────
    case "streak10": {
      makeReverb(0.4);
      // Orchestral hit đầu
      chord([65, 98, 130, 196], t, 0.5, "sawtooth", 0.18);
      burst(t, 0.15, 200, 1, 0.25, "lowpass");
      burst(t, 0.08, 8000, 5, 0.12, "highpass");

      // Fanfare 7 nốt — scale pentatonic
      const notes10 = [261, 329, 392, 523, 659, 784, 1047, 1319];
      notes10.forEach((f, i) => {
        const s = t + 0.15 + i*0.07;
        tone(f,    s, 0.28, "triangle", 0.3, 0.01);
        tone(f*2,  s+0.01, 0.18, "sine", 0.10, 0.005);
        tone(f*3,  s+0.01, 0.10, "sine", 0.04, 0.003);
      });

      // Chord đỉnh điểm — C major full
      chord([523, 659, 784, 1047, 1319], t+0.75, 1.0, "triangle", 0.16);
      chord([262, 330, 392], t+0.78, 0.9, "sine", 0.15);

      // Sweep epic
      sweep(3000, 6000, t+0.8, 0.5, "sine", 0.07);
      sweep(100, 60, t+0.7, 0.8, "sine", 0.2);

      // Sparkle
      [4186, 3136, 2093].forEach((f,i) => tone(f, t+0.9+i*0.1, 0.3, "sine", 0.05, 0.01));
      burst(t+0.7, 0.5, 6000, 3, 0.09, "highpass");
      burst(t+0.65, 0.3, 80, 2, 0.2, "lowpass");
      break;
    }

    // ── LOSE STREAK — Dramatic collapse ──────────────────────────────────────
    case "loseStreak": {
      // Glass shatter feel
      burst(t, 0.06, 4000, 8, 0.2, "highpass");
      burst(t+0.04, 0.08, 2000, 5, 0.15, "bandpass");
      // Cascade xuống
      [440, 330, 247, 165, 110, 73].forEach((f, i) => {
        sweep(f*1.2, f*0.7, t + i*0.07, 0.12, "sawtooth", 0.22);
      });
      // Tiếng rơi xuống sâu
      sweep(200, 30, t+0.3, 0.6, "sine", 0.3);
      sweep(180, 25, t+0.35, 0.55, "sawtooth", 0.15);
      burst(t+0.25, 0.5, 150, 1.5, 0.2, "lowpass");
      break;
    }

    default: break;
  }
}

// ─── MOBILE HOOK ─────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

// ─── STREAK CONFIG ────────────────────────────────────────────────────────────
// streak >= threshold → bonus % added on top of base score
const STREAK_TIERS = [
  { min: 10, bonus: 0.20, label: "🔥 ×INFERNO +20%", color: "#FF0000", glow: "#FF000088", fire: ["#FF0000","#FF2200","#FF4400"] },
  { min:  5, bonus: 0.15, label: "🔥 BLAZING +15%",  color: "#FF4400", glow: "#FF440088", fire: ["#FF4400","#FF6600","#FF8800"] },
  { min:  3, bonus: 0.05, label: "🔥 STREAK +5%",    color: "#FF8800", glow: "#FF880066", fire: ["#FF8800","#FFB300","#FFD700"] },
];
function getStreakTier(combo) { return STREAK_TIERS.find(t => combo >= t.min) || null; }

// ─── QUESTIONS ────────────────────────────────────────────────────────────────
const QUESTIONS = [
  // ══ CHƯƠNG 1: CÂN BẰNG HÓA HỌC ══════════════════════════════════════════
  { id:1, chapter:0, type:"mc", level:"BIẾT",
    q:"Phản ứng thuận nghịch là phản ứng",
    opts:["Xảy ra theo hai chiều ngược nhau trong cùng điều kiện.","Có phương trình hóa học được biểu diễn bằng mũi tên một chiều.","Chỉ xảy ra theo một chiều nhất định.","Xảy ra giữa hai chất khí."], ans:0 },
  { id:2, chapter:0, type:"mc", level:"BIẾT",
    q:"Mối quan hệ giữa tốc độ phản ứng thuận (vₜ) và tốc độ phản ứng nghịch (vₙ) ở trạng thái cân bằng?",
    opts:["vₜ = 2vₙ","vₜ = vₙ ≠ 0","vₜ = 0,5vₙ","vₜ = vₙ = 0"], ans:1 },
  { id:3, chapter:0, type:"mc", level:"BIẾT",
    q:"Tại nhiệt độ không đổi, ở trạng thái cân bằng:",
    opts:["Nồng độ các chất trong hỗn hợp phản ứng không thay đổi.","Nồng độ các chất trong hỗn hợp phản ứng vẫn liên tục thay đổi.","Phản ứng hóa học không xảy ra.","Tốc độ phản ứng xảy ra chậm dần."], ans:0 },
  { id:4, chapter:0, type:"mc", level:"BIẾT",
    q:"Khi một hệ ở trạng thái cân bằng thì trạng thái đó là",
    opts:["Cân bằng tĩnh.","Cân bằng động.","Cân bằng bền.","Cân bằng không bền."], ans:1 },
  { id:5, chapter:0, type:"mc", level:"BIẾT",
    q:"Hằng số cân bằng Kc của một phản ứng thuận nghịch phụ thuộc vào yếu tố nào?",
    opts:["Nồng độ","Nhiệt độ","Áp suất","Chất xúc tác"], ans:1 },
  { id:6, chapter:0, type:"mc", level:"BIẾT",
    q:"Sự phá vỡ cân bằng cũ để chuyển sang cân bằng mới do các yếu tố bên ngoài tác động gọi là",
    opts:["Sự biến đổi chất.","Sự dịch chuyển cân bằng.","Sự chuyển đổi vận tốc phản ứng.","Sự biến đổi hằng số cân bằng."], ans:1 },
  { id:7, chapter:0, type:"mc", level:"BIẾT",
    q:"Các yếu tố có thể ảnh hưởng đến cân bằng hóa học là",
    opts:["Nồng độ, nhiệt độ và chất xúc tác.","Nồng độ, áp suất và diện tích bề mặt.","Nồng độ, nhiệt độ và áp suất.","Áp suất, nhiệt độ và chất xúc tác."], ans:2 },
  { id:8, chapter:0, type:"mc", level:"BIẾT",
    q:"Yếu tố nào sau đây luôn luôn KHÔNG làm dịch chuyển cân bằng của hệ phản ứng?",
    opts:["Nhiệt độ","Áp suất","Nồng độ","Chất xúc tác"], ans:3 },
  { id:9, chapter:0, type:"mc", level:"BIẾT",
    q:"Trong phản ứng thuận nghịch, ở trạng thái cân bằng, phát biểu nào đúng?",
    opts:["Phản ứng thuận đã dừng.","Phản ứng nghịch đã dừng.","Nồng độ chất tham gia và sản phẩm bằng nhau.","Nồng độ của các chất trong hệ không đổi."], ans:3 },
  { id:10, chapter:0, type:"mc", level:"HIỂU",
    q:"Phát biểu nào sau đây tại trạng thái cân bằng là SAI?",
    opts:["Tốc độ phản ứng thuận bằng tốc độ phản ứng nghịch.","Nồng độ tất cả các chất trong hỗn hợp là không đổi.","Nồng độ mol chất phản ứng luôn bằng nồng độ mol chất sản phẩm.","Phản ứng thuận và nghịch vẫn diễn ra."], ans:2 },
  { id:11, chapter:0, type:"mc", level:"HIỂU",
    q:"CaCO₃(s) ⇌ CaO(s) + CO₂(g); phản ứng thuận thu nhiệt. Tác động nào chuyển dịch theo chiều thuận?",
    opts:["Tăng nồng độ CO₂.","Tăng áp suất.","Giảm nhiệt độ.","Tăng nhiệt độ."], ans:3 },
  { id:12, chapter:0, type:"mc", level:"HIỂU",
    q:"PCl₅(g) ⇌ PCl₃(g) + Cl₂(g); ΔH > 0. Cân bằng chuyển dịch theo chiều thuận khi",
    opts:["Thêm PCl₃ vào hệ.","Tăng áp suất.","Tăng nhiệt độ.","Thêm Cl₂ vào hệ."], ans:2 },
  { id:13, chapter:0, type:"mc", level:"HIỂU",
    q:"N₂(g) + O₂(g) ⇌ 2NO(g); ΔH > 0. Cân bằng chuyển dịch theo chiều thuận khi",
    opts:["Thêm chất xúc tác.","Giảm áp suất.","Thêm khí NO.","Tăng nhiệt độ."], ans:3 },
  { id:14, chapter:0, type:"mc", level:"HIỂU",
    q:"CO(g) + H₂O(g) ⇌ CO₂(g) + H₂(g); ΔH < 0. Cân bằng chuyển dịch theo chiều thuận khi",
    opts:["Tăng áp suất chung.","Cho chất xúc tác vào.","Thêm khí H₂.","Giảm nhiệt độ."], ans:3 },
  { id:15, chapter:0, type:"mc", level:"HIỂU",
    q:"H₂(g) + I₂(g) ⇌ 2HI(g); ΔH > 0. Cân bằng KHÔNG bị chuyển dịch khi",
    opts:["Tăng nhiệt độ.","Giảm nồng độ HI.","Tăng nồng độ H₂.","Giảm áp suất chung."], ans:3 },
  { id:16, chapter:0, type:"mc", level:"HIỂU",
    q:"N₂(g) + 3H₂(g) ⇌ 2NH₃(g); phản ứng thuận tỏa nhiệt. Cân bằng KHÔNG bị chuyển dịch khi",
    opts:["Thay đổi áp suất.","Thay đổi nồng độ N₂.","Thay đổi nhiệt độ.","Thêm chất xúc tác Fe."], ans:3 },
  { id:17, chapter:0, type:"mc", level:"HIỂU",
    q:"Xét cân bằng: 2SO₂(g) + O₂(g) ⇌ 2SO₃(g); ΔH < 0. Để tăng hiệu suất tạo SO₃, cần",
    opts:["Tăng nhiệt độ, giảm áp suất.","Giảm nhiệt độ, tăng áp suất, dùng xúc tác.","Tăng nhiệt độ, tăng áp suất.","Giảm nhiệt độ, giảm áp suất."], ans:1 },
  { id:18, chapter:0, type:"mc", level:"VẬN DỤNG",
    q:"Nhận xét nào sau đây KHÔNG đúng?",
    opts:["Trong phản ứng một chiều, các sản phẩm không phản ứng được với nhau tạo thành chất đầu.","Trong phản ứng thuận nghịch, các chất sản phẩm có thể phản ứng với nhau tạo thành chất đầu.","Phản ứng một chiều là phản ứng luôn xảy ra không hoàn toàn.","Phản ứng thuận nghịch là phản ứng xảy ra theo hai chiều trái ngược nhau trong cùng điều kiện."], ans:2 },
  { id:19, chapter:0, type:"mc", level:"VẬN DỤNG",
    q:"Cho cân bằng: 2HI(g) ⇌ H₂(g) + I₂(g). Ở 430°C, Kc = 0,02. Nồng độ ban đầu HI = 1M. Nồng độ H₂ ở cân bằng gần đúng là",
    opts:["0,067 M","0,123 M","0,200 M","0,050 M"], ans:0 },
  // ══ CHƯƠNG 2: NITROGEN & SULFUR ══════════════════════════════════════════
  { id:20, chapter:1, type:"mc", level:"BIẾT",
    q:"Trong không khí, nitrogen chiếm khoảng bao nhiêu phần trăm thể tích?",
    opts:["21%","78%","1%","50%"], ans:1 },
  { id:21, chapter:1, type:"mc", level:"BIẾT",
    q:"Ở điều kiện thường, N₂ tương đối trơ về mặt hóa học vì",
    opts:["Phân tử N₂ có liên kết đôi bền vững.","Phân tử N₂ có liên kết ba N≡N rất bền vững.","N₂ là phi kim yếu.","N₂ không tan trong nước."], ans:1 },
  { id:22, chapter:1, type:"mc", level:"BIẾT",
    q:"Ứng dụng nào sau đây của nitrogen là đúng?",
    opts:["Dùng để đốt cháy nhiên liệu.","Dùng làm môi trường trơ trong công nghiệp và bảo quản thực phẩm.","Dùng làm chất oxy hóa mạnh.","Dùng để tổng hợp nước."], ans:1 },
  { id:23, chapter:1, type:"mc", level:"BIẾT",
    q:"NH₃ (ammonia) có tính chất hóa học nào nổi bật?",
    opts:["Tính acid mạnh.","Tính base và tính khử.","Tính oxy hóa mạnh.","Tính trơ về mặt hóa học."], ans:1 },
  { id:24, chapter:1, type:"mc", level:"BIẾT",
    q:"Công thức phân tử của axit nitric (nitric acid) là",
    opts:["H₂SO₄","HNO₂","HNO₃","H₃PO₄"], ans:2 },
  { id:25, chapter:1, type:"mc", level:"BIẾT",
    q:"Sulfur dioxide (SO₂) là chất",
    opts:["Chỉ có tính oxy hóa.","Chỉ có tính khử.","Vừa có tính oxy hóa, vừa có tính khử.","Không có tính oxy hóa, không có tính khử."], ans:2 },
  { id:26, chapter:1, type:"mc", level:"HIỂU",
    q:"N₂(g) + 3H₂(g) ⇌ 2NH₃(g). Để tăng hiệu suất tổng hợp NH₃ trong công nghiệp, người ta dùng",
    opts:["Nhiệt độ cao, áp suất thấp, xúc tác.","Nhiệt độ vừa phải (~400°C), áp suất cao, xúc tác Fe.","Nhiệt độ cao, áp suất cao, không xúc tác.","Nhiệt độ thấp, áp suất thấp, xúc tác."], ans:1 },
  { id:27, chapter:1, type:"mc", level:"HIỂU",
    q:"HNO₃ đặc tác dụng với kim loại. Sản phẩm khử thường gặp nhất là",
    opts:["H₂","NO₂","N₂","NH₄⁺"], ans:1 },
  { id:28, chapter:1, type:"mc", level:"HIỂU",
    q:"2SO₂ + O₂ ⇌ 2SO₃. Để cân bằng dịch chuyển theo chiều thuận, cần",
    opts:["Giảm nồng độ SO₂.","Tăng áp suất và dùng xúc tác V₂O₅.","Tăng nhiệt độ cao (>600°C).","Giảm nồng độ O₂."], ans:1 },
  { id:29, chapter:1, type:"mc", level:"HIỂU",
    q:"Khí nào sau đây làm mất màu dung dịch Br₂?",
    opts:["N₂","NO₂","SO₂","NH₃"], ans:2 },
  { id:30, chapter:1, type:"mc", level:"HIỂU",
    q:"Phản ứng nào sau đây chứng tỏ NH₃ có tính khử?",
    opts:["NH₃ + HCl → NH₄Cl","4NH₃ + 3O₂ → 2N₂ + 6H₂O","NH₃ + H₂O ⇌ NH₄⁺ + OH⁻","NH₃ + CO₂ + H₂O → NH₄HCO₃"], ans:1 },
  { id:31, chapter:1, type:"mc", level:"VẬN DỤNG",
    q:"Hòa tan 9,8 g H₂SO₄ vào nước được 200 mL dung dịch. Nồng độ mol của dung dịch H₂SO₄ là",
    opts:["0,25 M","0,5 M","1,0 M","2,0 M"], ans:1 },
  { id:32, chapter:1, type:"mc", level:"VẬN DỤNG",
    q:"Cho 6,72 lít NH₃ (đktc) tác dụng với dung dịch H₂SO₄ vừa đủ. Khối lượng muối thu được là",
    opts:["16,5 g","33 g","13,2 g","26,4 g"], ans:1 },
  // ══ CHƯƠNG 3: HÓA HỌC HỮU CƠ ════════════════════════════════════════════
  { id:33, chapter:2, type:"mc", level:"BIẾT",
    q:"Đặc điểm nào sau đây là của hợp chất hữu cơ?",
    opts:["Thường có nhiệt độ nóng chảy cao, khó bay hơi.","Thường không tan trong nước, tan trong dung môi hữu cơ.","Phần lớn có phản ứng xảy ra rất nhanh.","Không thể bị đốt cháy."], ans:1 },
  { id:34, chapter:2, type:"mc", level:"BIẾT",
    q:"Đồng phân là những chất có",
    opts:["Công thức phân tử khác nhau nhưng cấu tạo giống nhau.","Cấu tạo khác nhau nhưng có cùng công thức phân tử.","Cùng công thức phân tử và cùng cấu tạo.","Số nguyên tử carbon bằng nhau."], ans:1 },
  { id:35, chapter:2, type:"mc", level:"BIẾT",
    q:"Đồng đẳng là hiện tượng các chất có",
    opts:["Cùng công thức phân tử, khác cấu tạo.","Cấu tạo và tính chất tương tự nhau, công thức phân tử hơn kém nhau một hay nhiều nhóm CH₂.","Cùng số nguyên tử C nhưng khác số H.","Cùng loại liên kết hóa học."], ans:1 },
  { id:36, chapter:2, type:"mc", level:"BIẾT",
    q:"Liên kết ba trong phân tử hợp chất hữu cơ gồm",
    opts:["3 liên kết sigma.","1 liên kết sigma và 2 liên kết pi.","2 liên kết sigma và 1 liên kết pi.","3 liên kết pi."], ans:1 },
  { id:37, chapter:2, type:"mc", level:"BIẾT",
    q:"Liên kết nào sau đây bền hơn trong phân tử hữu cơ?",
    opts:["Liên kết pi (π)","Liên kết sigma (σ)","Cả hai như nhau.","Tùy thuộc vào phân tử."], ans:1 },
  { id:38, chapter:2, type:"mc", level:"BIẾT",
    q:"Nguyên tố nào bắt buộc phải có trong hợp chất hữu cơ?",
    opts:["Hydrogen","Carbon","Oxygen","Nitrogen"], ans:1 },
  { id:39, chapter:2, type:"mc", level:"BIẾT",
    q:"Phương pháp nào sau đây dùng để xác định công thức phân tử hợp chất hữu cơ?",
    opts:["Phổ hồng ngoại (IR)","Phân tích nguyên tố kết hợp phổ khối (MS)","Sắc ký","Đo điểm nóng chảy"], ans:1 },
  { id:40, chapter:2, type:"mc", level:"HIỂU",
    q:"Cho các cặp chất: CH₃CH₂COOH và HCOOCH₂CH₃. Mối quan hệ giữa chúng là",
    opts:["Đồng đẳng","Đồng phân","Không có quan hệ gì","Cùng dãy đồng đẳng với acetic acid"], ans:1 },
  { id:41, chapter:2, type:"mc", level:"HIỂU",
    q:"Số đồng phân cấu tạo mạch hở có cùng công thức C₂H₆O là",
    opts:["1","2","3","4"], ans:1 },
  { id:42, chapter:2, type:"mc", level:"HIỂU",
    q:"Số đồng phân cấu tạo mạch hở có cùng công thức C₃H₈O là",
    opts:["2","3","4","5"], ans:1 },
  { id:43, chapter:2, type:"mc", level:"HIỂU",
    q:"Số đồng phân cấu tạo mạch hở có cùng công thức C₅H₁₂ là",
    opts:["2","3","4","5"], ans:1 },
  { id:44, chapter:2, type:"mc", level:"HIỂU",
    q:"Chất nào sau đây là đồng đẳng của ethanol (C₂H₅OH)?",
    opts:["CH₃OCH₃","C₃H₇OH","C₂H₅Cl","HCHO"], ans:1 },
  { id:45, chapter:2, type:"mc", level:"HIỂU",
    q:"Công thức phân tử nào sau đây có thể là alkane?",
    opts:["C₃H₄","C₃H₆","C₃H₈","C₃H₁₀"], ans:2 },
  { id:46, chapter:2, type:"mc", level:"VẬN DỤNG",
    q:"Hợp chất hữu cơ X có công thức thực nghiệm CH₂O và phân tử khối là 60. Công thức phân tử của X là",
    opts:["CH₂O","C₂H₄O₂","C₃H₆O₃","C₄H₈O₄"], ans:1 },
  // ══ ĐÚNG / SAI ════════════════════════════════════════════════════════════
  { id:47, chapter:0, type:"tf", level:"HIỂU",
    q:"Xét các phát biểu về phản ứng thuận nghịch và cân bằng hóa học:",
    items:[
      { text:"Phản ứng một chiều là phản ứng chỉ xảy ra theo một chiều từ chất đầu sang sản phẩm.", correct:true },
      { text:"Ở trạng thái cân bằng, tốc độ phản ứng thuận bằng tốc độ phản ứng nghịch và cả hai đều bằng 0.", correct:false },
      { text:"Hằng số cân bằng Kc chỉ phụ thuộc vào nhiệt độ, không phụ thuộc vào nồng độ hay áp suất.", correct:true },
      { text:"Chất xúc tác làm thay đổi hằng số cân bằng Kc.", correct:false },
    ]},
  { id:48, chapter:0, type:"tf", level:"HIỂU",
    q:"Xét nguyên lý Le Chatelier (nguyên lý chuyển dịch cân bằng):",
    items:[
      { text:"Khi tăng nồng độ chất phản ứng, cân bằng dịch chuyển theo chiều thuận.", correct:true },
      { text:"Khi tăng áp suất, cân bằng dịch chuyển về phía làm tăng số mol khí.", correct:false },
      { text:"Khi tăng nhiệt độ, cân bằng dịch chuyển theo chiều thu nhiệt.", correct:true },
      { text:"Chất xúc tác làm cho cân bằng dịch chuyển theo chiều thuận.", correct:false },
    ]},
  { id:49, chapter:0, type:"tf", level:"VẬN DỤNG",
    q:"Xét cân bằng: 2NO₂(g, nâu) ⇌ N₂O₄(g, không màu); ΔH < 0",
    items:[
      { text:"Khi tăng nhiệt độ, màu hỗn hợp khí đậm hơn do cân bằng dịch theo chiều nghịch.", correct:true },
      { text:"Khi tăng áp suất, cân bằng dịch chuyển theo chiều thuận (tạo N₂O₄).", correct:true },
      { text:"Khi thêm NO₂, cân bằng dịch chuyển theo chiều nghịch.", correct:false },
      { text:"Hằng số cân bằng Kc tăng khi tăng áp suất.", correct:false },
    ]},
  { id:50, chapter:1, type:"tf", level:"HIỂU",
    q:"Xét tính chất của nitrogen và hợp chất của nitrogen:",
    items:[
      { text:"N₂ vừa có tính oxy hóa, vừa có tính khử.", correct:true },
      { text:"NH₃ tan nhiều trong nước tạo dung dịch có tính base.", correct:true },
      { text:"HNO₃ loãng tác dụng với kim loại thường tạo sản phẩm khử là NO₂.", correct:false },
      { text:"Muối ammonium bị nhiệt phân tạo NH₃ và acid tương ứng.", correct:true },
    ]},
  { id:51, chapter:2, type:"tf", level:"HIỂU",
    q:"Xét thuyết cấu tạo trong phân tử hợp chất hữu cơ:",
    items:[
      { text:"Trong phân tử hợp chất hữu cơ, các nguyên tử liên kết với nhau theo đúng hóa trị và thứ tự nhất định.", correct:true },
      { text:"Hóa trị phổ biến: C (IV), N (III), O (II), halogen (I).", correct:true },
      { text:"Nguyên tử carbon chỉ liên kết với nguyên tử của các nguyên tố khác, không liên kết với nhau.", correct:false },
      { text:"Tính chất của các chất phụ thuộc vào thành phần phân tử và cấu tạo hóa học.", correct:true },
    ]},
  { id:52, chapter:2, type:"tf", level:"HIỂU",
    q:"Xét các phát biểu về liên kết trong phân tử hợp chất hữu cơ:",
    items:[
      { text:"Liên kết đơn gồm 1 liên kết sigma (σ).", correct:true },
      { text:"Liên kết đôi gồm 2 liên kết sigma (σ).", correct:false },
      { text:"Liên kết ba gồm 1 liên kết sigma và 2 liên kết pi.", correct:true },
      { text:"Liên kết pi bền vững hơn liên kết sigma.", correct:false },
    ]},
  { id:53, chapter:2, type:"tf", level:"HIỂU",
    q:"Xét các phát biểu về đồng đẳng và đồng phân:",
    items:[
      { text:"Đồng phân là những chất có cấu tạo khác nhau nhưng có cùng công thức phân tử.", correct:true },
      { text:"Đồng phân lập thể là những chất có cùng CTPT, cùng CTCT nhưng khác nhau về vị trí không gian của nguyên tử, nhóm nguyên tử.", correct:true },
      { text:"Đồng đẳng là các chất có cùng công thức phân tử, hơn kém nhau một hay nhiều nhóm CH₂.", correct:false },
      { text:"Có thể có hai chất vừa thuộc cùng dãy đồng đẳng, vừa là đồng phân của nhau.", correct:false },
    ]},
  // ══ CHƯƠNG 1 THÊM: CÂN BẰNG HÓA HỌC ═══════════════════════════════════════
  { id:54, chapter:0, type:"mc", level:"BIẾT",
    q:"Biểu thức hằng số cân bằng Kc của phản ứng N₂(g) + 3H₂(g) ⇌ 2NH₃(g) là",
    opts:["Kc = [NH₃]²/([N₂][H₂]³)","Kc = [N₂][H₂]³/[NH₃]²","Kc = [NH₃]/([N₂][H₂])","Kc = 2[NH₃]/([N₂]+3[H₂])"], ans:0 },

  { id:55, chapter:0, type:"mc", level:"BIẾT",
    q:"Đặc điểm nào SAI khi nói về hằng số cân bằng Kc?",
    opts:["Kc phụ thuộc vào bản chất phản ứng","Kc phụ thuộc vào nhiệt độ","Kc phụ thuộc vào nồng độ ban đầu của các chất","Kc đặc trưng cho mỗi phản ứng thuận nghịch"], ans:2 },

  { id:56, chapter:0, type:"mc", level:"BIẾT",
    q:"Phản ứng nào sau đây là phản ứng thuận nghịch?",
    opts:["2H₂ + O₂ → 2H₂O","Na + H₂O → NaOH + ½H₂","H₂ + I₂ ⇌ 2HI","2KClO₃ → 2KCl + 3O₂"], ans:2 },

  { id:57, chapter:0, type:"mc", level:"HIỂU",
    q:"Cho cân bằng: Fe₃O₄(s) + 4H₂(g) ⇌ 3Fe(s) + 4H₂O(g); ΔH > 0. Cân bằng dịch chiều thuận khi",
    opts:["Giảm nhiệt độ","Tăng nồng độ H₂O","Thêm Fe₃O₄ vào hệ","Tăng nhiệt độ"], ans:3 },

  { id:58, chapter:0, type:"mc", level:"HIỂU",
    q:"Cho Kc của phản ứng A ⇌ B là 4. Nếu nồng độ ban đầu [A]₀ = 1M, nồng độ [B] ở cân bằng là",
    opts:["0,2 M","0,4 M","0,8 M","1,0 M"], ans:2 },

  { id:59, chapter:0, type:"mc", level:"HIỂU",
    q:"Trong sản xuất công nghiệp, việc dùng xúc tác trong phản ứng tổng hợp ammonia có tác dụng",
    opts:["Làm tăng hiệu suất phản ứng","Làm tăng Kc của phản ứng","Giúp đạt cân bằng nhanh hơn mà không thay đổi hiệu suất","Làm thay đổi nhiệt độ phản ứng"], ans:2 },

  { id:60, chapter:0, type:"mc", level:"HIỂU",
    q:"Phản ứng: 2SO₃(g) ⇌ 2SO₂(g) + O₂(g); ΔH > 0. Yếu tố nào làm cân bằng dịch chiều nghịch?",
    opts:["Tăng nhiệt độ","Giảm áp suất","Tăng nồng độ SO₂","Tăng áp suất"], ans:3 },

  { id:61, chapter:0, type:"mc", level:"HIỂU",
    q:"Kc của phản ứng thuận nghịch A + B ⇌ C là 0,5 ở 25°C. Kc của phản ứng nghịch C ⇌ A + B ở cùng nhiệt độ là",
    opts:["0,5","2","−0,5","1"], ans:1 },

  { id:62, chapter:0, type:"mc", level:"HIỂU",
    q:"Trong phản ứng: CO(g) + Cl₂(g) ⇌ COCl₂(g). Khi tăng áp suất, cân bằng sẽ",
    opts:["Dịch theo chiều thuận vì giảm số mol khí","Dịch theo chiều nghịch","Không thay đổi vì Kc không đổi","Dịch theo chiều thuận vì tăng nồng độ"], ans:0 },

  { id:63, chapter:0, type:"mc", level:"VẬN DỤNG",
    q:"Ở 450°C, Kc = 0,020 cho phản ứng 2HI ⇌ H₂ + I₂. Hỗn hợp đầu gồm 0,4 mol HI trong bình 2L. Nồng độ I₂ ở cân bằng gần đúng là",
    opts:["0,018 M","0,025 M","0,050 M","0,013 M"], ans:0 },

  { id:64, chapter:0, type:"mc", level:"VẬN DỤNG",
    q:"Phản ứng: CH₄(g) + H₂O(g) ⇌ CO(g) + 3H₂(g); ΔH > 0. Để tăng hiệu suất tạo H₂ trong công nghiệp, người ta",
    opts:["Giảm nhiệt độ và tăng áp suất","Tăng nhiệt độ, giảm áp suất và dùng xúc tác","Giảm nhiệt độ và giảm áp suất","Tăng áp suất và tăng nồng độ H₂O"], ans:1 },

  { id:65, chapter:0, type:"mc", level:"VẬN DỤNG",
    q:"Cho phản ứng: A(g) ⇌ 2B(g); Kc = 4. Nồng độ ban đầu [A]₀ = 2M, không có B. Nồng độ B ở cân bằng là",
    opts:["1,46 M","2 M","0,73 M","3 M"], ans:0 },

  { id:66, chapter:0, type:"tf", level:"HIỂU",
    q:"Xét phản ứng: N₂(g) + 3H₂(g) ⇌ 2NH₃(g); ΔH < 0. Chọn Đúng/Sai:",
    items:[
      { text:"Tăng áp suất làm cân bằng dịch theo chiều thuận tạo thêm NH₃.", correct:true },
      { text:"Tăng nhiệt độ làm tăng hiệu suất tổng hợp NH₃.", correct:false },
      { text:"Chất xúc tác Fe không làm thay đổi Kc của phản ứng.", correct:true },
      { text:"Khi cân bằng dịch chuyển, giá trị Kc thay đổi theo chiều dịch chuyển.", correct:false },
    ]},

  { id:67, chapter:0, type:"tf", level:"VẬN DỤNG",
    q:"Xét cân bằng: 2NO₂(g, nâu) ⇌ N₂O₄(g, không màu); ΔH < 0. Chọn Đúng/Sai:",
    items:[
      { text:"Khi làm lạnh hỗn hợp, màu nâu nhạt dần do cân bằng dịch theo chiều thuận.", correct:true },
      { text:"Khi tăng áp suất, hỗn hợp sẽ có màu đậm hơn.", correct:false },
      { text:"Khi thêm khí NO₂ vào, cân bằng dịch theo chiều tạo thêm N₂O₄.", correct:true },
      { text:"Kc tăng khi tăng nồng độ NO₂.", correct:false },
    ]},

  // ══ CHƯƠNG 2 THÊM: NITROGEN & SULFUR ════════════════════════════════════════
  { id:68, chapter:1, type:"mc", level:"BIẾT",
    q:"Số oxi hóa của nitrogen trong NH₄⁺ là",
    opts:["-3","+3","+5","0"], ans:0 },

  { id:69, chapter:1, type:"mc", level:"BIẾT",
    q:"Dung dịch HNO₃ đặc nguội tác dụng được với kim loại nào sau đây?",
    opts:["Al","Fe","Cu","Cả Al và Fe đều không phản ứng"], ans:2 },

  { id:70, chapter:1, type:"mc", level:"BIẾT",
    q:"Phân đạm urê có công thức là",
    opts:["NH₄NO₃","(NH₄)₂SO₄","CO(NH₂)₂","Ca(H₂PO₄)₂"], ans:2 },

  { id:71, chapter:1, type:"mc", level:"BIẾT",
    q:"Khí nào sau đây có mùi khai, tan nhiều trong nước tạo dung dịch base?",
    opts:["NO","NO₂","NH₃","N₂"], ans:2 },

  { id:72, chapter:1, type:"mc", level:"BIẾT",
    q:"Sulfuric acid đặc được dùng làm chất hút ẩm vì",
    opts:["H₂SO₄ là acid mạnh","H₂SO₄ đặc háo nước và hút ẩm mạnh","H₂SO₄ có tính oxy hóa mạnh","H₂SO₄ dễ bay hơi"], ans:1 },

  { id:73, chapter:1, type:"mc", level:"BIẾT",
    q:"Phản ứng nào chứng minh HNO₃ có tính acid?",
    opts:["3Cu + 8HNO₃(loãng) → 3Cu(NO₃)₂ + 2NO↑ + 4H₂O","HNO₃ + NaOH → NaNO₃ + H₂O","4HNO₃(đặc) → 4NO₂ + O₂ + 2H₂O","C + 4HNO₃(đặc) → CO₂ + 4NO₂ + 2H₂O"], ans:1 },

  { id:74, chapter:1, type:"mc", level:"BIẾT",
    q:"Muối nào sau đây là phân đạm ammonium?",
    opts:["KNO₃","NH₄Cl","Ca(H₂PO₄)₂","K₂SO₄"], ans:1 },

  { id:75, chapter:1, type:"mc", level:"HIỂU",
    q:"Cho 200 mL dung dịch HNO₃ 2M tác dụng với lượng dư Cu. Thể tích khí NO (đktc) thu được là",
    opts:["2,24 L","4,48 L","1,49 L","3,36 L"], ans:0 },

  { id:76, chapter:1, type:"mc", level:"HIỂU",
    q:"Phản ứng nhiệt phân muối NH₄NO₃ ở nhiệt độ cao tạo ra",
    opts:["NH₃ và HNO₃","N₂O và H₂O","N₂ và H₂O","NO và H₂O"], ans:1 },

  { id:77, chapter:1, type:"mc", level:"HIỂU",
    q:"Trong phòng thí nghiệm, điều chế NH₃ bằng cách",
    opts:["Cho N₂ tác dụng với H₂ có xúc tác","Đun nóng muối ammonium với dung dịch kiềm","Điện phân dung dịch NH₄Cl","Cho NH₄Cl tác dụng với H₂SO₄"], ans:1 },

  { id:78, chapter:1, type:"mc", level:"HIỂU",
    q:"Cho dung dịch AgNO₃ vào dung dịch nào sau đây sẽ có kết tủa vàng xuất hiện?",
    opts:["HCl","H₃PO₄","HNO₃","H₂SO₄"], ans:1 },

  { id:79, chapter:1, type:"mc", level:"HIỂU",
    q:"Phản ứng: SO₂ + Br₂ + 2H₂O → H₂SO₄ + 2HBr. SO₂ thể hiện tính chất gì?",
    opts:["Tính acid","Tính oxy hóa","Tính khử","Tính base"], ans:2 },

  { id:80, chapter:1, type:"mc", level:"HIỂU",
    q:"H₂SO₄ loãng phản ứng được với tất cả các chất trong nhóm nào?",
    opts:["Cu, CuO, NaCl","Fe, CaO, Na₂CO₃","Au, Fe₂O₃, KNO₃","Ag, MgO, BaCl₂"], ans:1 },

  { id:81, chapter:1, type:"mc", level:"VẬN DỤNG",
    q:"Cho 11,2 g Fe tác dụng hoàn toàn với HNO₃ loãng dư. Thể tích NO (đktc) thu được là",
    opts:["2,24 L","4,48 L","3,36 L","6,72 L"], ans:1 },

  { id:82, chapter:1, type:"mc", level:"VẬN DỤNG",
    q:"Hàm lượng % N trong phân đạm urê CO(NH₂)₂ (M = 60) là",
    opts:["23,3%","35,0%","46,7%","28,0%"], ans:2 },

  { id:83, chapter:1, type:"mc", level:"VẬN DỤNG",
    q:"Đốt cháy hoàn toàn 3,4 g H₂S trong oxi dư. Khối lượng SO₂ thu được là",
    opts:["3,2 g","6,4 g","4,8 g","9,6 g"], ans:1 },

  { id:84, chapter:1, type:"tf", level:"HIỂU",
    q:"Xét các phát biểu về nitrogen và hợp chất của nitrogen. Chọn Đúng/Sai:",
    items:[
      { text:"N₂ tác dụng với O₂ ở nhiệt độ cao (3000°C hoặc tia lửa điện) tạo NO.", correct:true },
      { text:"NH₃ tác dụng với HCl tạo NH₄Cl — phản ứng này chứng minh NH₃ có tính base.", correct:true },
      { text:"HNO₃ đặc, nguội bị thụ động hóa bởi Al và Fe nên không phản ứng với hai kim loại này.", correct:true },
      { text:"Phân urê có hàm lượng đạm cao hơn phân NH₄NO₃.", correct:false },
    ]},

  { id:85, chapter:1, type:"tf", level:"VẬN DỤNG",
    q:"Xét các phát biểu về sulfur và hợp chất của sulfur. Chọn Đúng/Sai:",
    items:[
      { text:"SO₂ vừa có tính oxy hóa vừa có tính khử.", correct:true },
      { text:"H₂SO₄ đặc tác dụng với Cu tạo khí SO₂, chứng tỏ H₂SO₄ đặc có tính oxy hóa mạnh.", correct:true },
      { text:"Dung dịch H₂SO₄ loãng tác dụng được với Cu.", correct:false },
      { text:"SO₃ là oxide acid, tác dụng với nước tạo H₂SO₄.", correct:true },
    ]},

  // ══ CHƯƠNG 3 THÊM: HÓA HỌC HỮU CƠ ═════════════════════════════════════════
  { id:86, chapter:2, type:"mc", level:"BIẾT",
    q:"Chất nào sau đây là hydrocarbon?",
    opts:["C₂H₅OH","C₆H₁₂O₆","C₄H₁₀","CH₃COOH"], ans:2 },

  { id:87, chapter:2, type:"mc", level:"BIẾT",
    q:"Alkane có công thức tổng quát là",
    opts:["CₙH₂ₙ","CₙH₂ₙ₋₂","CₙH₂ₙ₊₂","CₙHₙ"], ans:2 },

  { id:88, chapter:2, type:"mc", level:"BIẾT",
    q:"Liên kết C–C trong alkane là loại liên kết nào?",
    opts:["Liên kết đôi C=C","Liên kết ba C≡C","Liên kết đơn σ (sigma)","Liên kết π (pi)"], ans:2 },

  { id:89, chapter:2, type:"mc", level:"BIẾT",
    q:"Phản ứng đặc trưng của alkane là",
    opts:["Phản ứng cộng","Phản ứng thế (halogen hóa)","Phản ứng trùng hợp","Phản ứng tách nước"], ans:1 },

  { id:90, chapter:2, type:"mc", level:"BIẾT",
    q:"Công thức phân tử của propane là",
    opts:["C₂H₆","C₃H₈","C₄H₁₀","C₃H₆"], ans:1 },

  { id:91, chapter:2, type:"mc", level:"BIẾT",
    q:"Hợp chất hữu cơ là hợp chất của nguyên tố nào (bắt buộc)?",
    opts:["Hydrogen","Carbon","Oxygen","Nitrogen"], ans:1 },

  { id:92, chapter:2, type:"mc", level:"BIẾT",
    q:"Alkene có đặc điểm cấu tạo là",
    opts:["Chỉ có liên kết đơn C–C","Có một liên kết đôi C=C trong phân tử","Có một liên kết ba C≡C","Có vòng thơm benzene"], ans:1 },

  { id:93, chapter:2, type:"mc", level:"BIẾT",
    q:"Chất nào sau đây thuộc dãy đồng đẳng của ethylene (C₂H₄)?",
    opts:["C₂H₂","C₃H₈","C₃H₆","C₄H₁₀"], ans:2 },

  { id:94, chapter:2, type:"mc", level:"HIỂU",
    q:"Đốt cháy hoàn toàn một alkane thu được CO₂ và H₂O với tỉ lệ mol nCO₂ : nH₂O = 2:3. Alkane đó là",
    opts:["Methane (CH₄)","Ethane (C₂H₆)","Propane (C₃H₈)","Butane (C₄H₁₀)"], ans:1 },

  { id:95, chapter:2, type:"mc", level:"HIỂU",
    q:"Hợp chất C₄H₁₀ có bao nhiêu đồng phân cấu tạo?",
    opts:["1","2","3","4"], ans:1 },

  { id:96, chapter:2, type:"mc", level:"HIỂU",
    q:"Sản phẩm chính của phản ứng CH₃CH=CH₂ + HBr theo quy tắc Markovnikov là",
    opts:["CH₃CH₂CH₂Br","CH₃CHBrCH₃","BrCH₂CH₂CH₃","CH₂BrCH=CH₂"], ans:1 },

  { id:97, chapter:2, type:"mc", level:"HIỂU",
    q:"Đốt cháy hoàn toàn 0,1 mol C₃H₈ cần bao nhiêu mol O₂?",
    opts:["0,3 mol","0,5 mol","0,4 mol","0,25 mol"], ans:1 },

  { id:98, chapter:2, type:"mc", level:"HIỂU",
    q:"Phản ứng trùng hợp ethylene tạo polyethylene (PE) là ví dụ của loại phản ứng nào?",
    opts:["Phản ứng thế","Phản ứng tách","Phản ứng cộng","Phản ứng trùng hợp"], ans:3 },

  { id:99, chapter:2, type:"mc", level:"HIỂU",
    q:"Chất nào sau đây làm mất màu dung dịch bromine trong nước (Br₂/H₂O)?",
    opts:["CH₄","C₂H₆","C₂H₄","C₄H₁₀"], ans:2 },

  { id:100, chapter:2, type:"mc", level:"HIỂU",
    q:"Hợp chất hữu cơ X có công thức phân tử C₂H₆O. Số đồng phân cấu tạo của X là",
    opts:["1","2","3","4"], ans:1 },

  { id:101, chapter:2, type:"mc", level:"VẬN DỤNG",
    q:"Đốt cháy hoàn toàn 3,6 g một alkane X thu được 5,4 g H₂O. Công thức phân tử X là",
    opts:["CH₄","C₂H₆","C₃H₈","C₄H₁₀"], ans:0 },

  { id:102, chapter:2, type:"mc", level:"VẬN DỤNG",
    q:"Hỗn hợp gồm CH₄ và C₂H₄ có tỉ khối so với H₂ là 13. % thể tích CH₄ trong hỗn hợp là",
    opts:["25%","50%","75%","60%"], ans:1 },

  { id:103, chapter:2, type:"mc", level:"VẬN DỤNG",
    q:"Cho 5,6 L (đktc) hỗn hợp CH₄ và C₂H₄ đi qua dung dịch Br₂ dư. Khối lượng Br₂ phản ứng là 16 g. % thể tích C₂H₄ là",
    opts:["25%","40%","50%","60%"], ans:2 },

  { id:104, chapter:2, type:"tf", level:"HIỂU",
    q:"Xét các phát biểu về hydrocarbon. Chọn Đúng/Sai:",
    items:[
      { text:"Alkane tác dụng với Cl₂ khi có ánh sáng theo phản ứng thế.", correct:true },
      { text:"Alkene tham gia phản ứng cộng HX theo quy tắc Markovnikov — H cộng vào C mang nhiều H hơn.", correct:true },
      { text:"Đốt cháy hoàn toàn một hydrocarbon luôn thu được CO₂ và H₂O.", correct:true },
      { text:"Alkane và alkene đều làm mất màu dung dịch Br₂.", correct:false },
    ]},

  { id:105, chapter:2, type:"tf", level:"VẬN DỤNG",
    q:"Xét các phát biểu về đặc điểm và phân tích hợp chất hữu cơ. Chọn Đúng/Sai:",
    items:[
      { text:"Thành phần nguyên tố C và H bắt buộc phải có trong mọi hợp chất hữu cơ.", correct:false },
      { text:"Phổ hồng ngoại (IR) giúp xác định nhóm chức trong phân tử hữu cơ.", correct:true },
      { text:"Hai chất C₂H₅OH và CH₃OCH₃ là đồng phân của nhau vì có cùng CTPT C₂H₆O.", correct:true },
      { text:"Phân tích nguyên tố xác định được công thức phân tử chính xác của hợp chất hữu cơ mà không cần biết khối lượng mol.", correct:false },
    ]},
];

const CHAPTERS = [
  { name:"Cân Bằng Hóa Học", color:"#00D9FF" },
  { name:"Nitrogen & Sulfur",  color:"#D946EF" },
  { name:"Hóa Học Hữu Cơ",    color:"#CCFF00" },
];
const LEVELS = { "BIẾT":"#00D9FF", "HIỂU":"#D946EF", "VẬN DỤNG":"#FF8C00" };
const CL = { blue:"#00D9FF", purple:"#D946EF", green:"#CCFF00", red:"#FF0080", dim:"#64748B", navy:"#0F172A", mid:"#1E293B" };

const TIMER_MAX = 30;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(s){ return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`; }
function btnS(col, ghost=false, small=false){
  return { fontFamily:"'Space Mono',monospace", fontSize:small?10:11, letterSpacing:1,
    padding:small?"6px 12px":"10px 20px", border:`1px solid ${col}44`,
    background:ghost?"transparent":`linear-gradient(135deg,${col}18,${col}08)`,
    color:col, cursor:"pointer", textTransform:"uppercase", outline:"none",
    transition:"all 0.2s", borderRadius:2,
    boxShadow:`0 0 0px ${col}00`,
    position:"relative", overflow:"hidden" };
}

// ─── FIRE CANVAS (animated flames behind combo number) ────────────────────────
function FireCanvas({ tier }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    if (!tier) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    class FP {
      constructor() { this.reset(); }
      reset() {
        this.x = W/2 + (Math.random()-0.5)*40;
        this.y = H;
        this.vx = (Math.random()-0.5)*1.2;
        this.vy = -(1.5 + Math.random()*2.5);
        this.life = 1;
        this.decay = 0.015 + Math.random()*0.02;
        this.r = 4 + Math.random()*8;
        this.colors = tier.fire;
      }
      update() { this.x += this.vx; this.y += this.vy; this.vy *= 0.98; this.life -= this.decay; this.r *= 0.985; if(this.life<=0) this.reset(); }
      draw() {
        const t = 1-this.life;
        const ci = Math.floor(t * (this.colors.length-1));
        const col = this.colors[Math.min(ci, this.colors.length-1)];
        ctx.save();
        ctx.globalAlpha = this.life * 0.85;
        const g = ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r);
        g.addColorStop(0,"white"); g.addColorStop(0.3,col); g.addColorStop(1,"transparent");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    // spawn particles
    const N = 35;
    particlesRef.current = Array.from({length:N}, ()=>{ const p=new FP(); p.life=Math.random(); return p; });

    function loop() {
      ctx.clearRect(0,0,W,H);
      particlesRef.current.forEach(p=>{ p.update(); p.draw(); });
      animRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [tier]);

  if (!tier) return null;
  return <canvas ref={canvasRef} width={160} height={110} style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", pointerEvents:"none", opacity:0.9 }} />;
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("menu");
  const [filterChapter, setFilterChapter] = useState(null);
  const [filterLevel, setFilterLevel]     = useState(null);
  const [queue, setQueue]   = useState([]);
  const [qIdx, setQIdx]     = useState(0);
  const [score, setScore]   = useState(0);
  const [combo, setCombo]   = useState(0);
  const [results, setResults] = useState([]);
  const [timer, setTimer]   = useState(TIMER_MAX);
  const [phase, setPhase]   = useState("playing");
  const [selected, setSelected] = useState(null);
  const [tfSelections, setTfSelections] = useState({});
  const [flash, setFlash]   = useState("");
  const [toasts, setToasts] = useState([]);
  const [particles, setParticles] = useState([]);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionType, setTransitionType] = useState("");
  const [floatingXP, setFloatingXP] = useState([]); // +XP nổi lên
  const [screenShake, setScreenShake] = useState(false); // rung màn hình
  const [glitch, setGlitch] = useState(false); // glitch khi sai
  const [milestone, setMilestone] = useState(null); // popup milestone streak
  const timerRef = useRef(null);

  function startGame() {
    let pool = QUESTIONS;
    if (filterChapter !== null) pool = pool.filter(q=>q.chapter===filterChapter);
    if (filterLevel) pool = pool.filter(q=>q.level===filterLevel);
    if (pool.length === 0) pool = QUESTIONS;
    const shuffled = [...pool].sort(()=>Math.random()-0.5).slice(0,15);
    setQueue(shuffled); setQIdx(0); setScore(0); setCombo(0); setResults([]);
    setPhase("playing"); setSelected(null); setTfSelections({}); setTimer(TIMER_MAX);
    setScreen("game");
  }

  const current = queue[qIdx];

  useEffect(()=>{ if(screen!=="game") return; setInputReset(); }, [qIdx]);
  function setInputReset(){ setPhase("playing"); setSelected(null); setTfSelections({}); setTimer(TIMER_MAX); }

  useEffect(()=>{
    if(screen!=="game"||phase!=="playing"){ clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(()=>{
      setTimer(t=>{ if(t<=1){ clearInterval(timerRef.current); return 0; } return t-1; });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[screen,phase,qIdx]);

  // Khi timer chạm 0 trong lúc đang chơi → kết thúc câu ngay
  useEffect(()=>{
    if(timer===0 && phase==="playing" && screen==="game"){
      clearInterval(timerRef.current);
      setPhase("timeout");
      setCombo(0);
      setResults(r=>[...r,{correct:false,earned:0}]);
      triggerFlash("red");
      boom(CL.red,12);
      triggerShake();
      toast("⏱ Hết giờ! Xem đáp án →",true);
      playSound("timeout");
    }
  },[timer]);

  const toast = useCallback((msg,err=false)=>{
    const id=Date.now()+Math.random();
    setToasts(t=>[...t,{id,msg,err}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2500);
  },[]);
  const triggerFlash = useCallback((col)=>{ setFlash(col); setTimeout(()=>setFlash(""),200); },[]);
  const boom = useCallback((color,n=22)=>{
    const cx=window.innerWidth/2, cy=window.innerHeight*0.45;
    const ps=Array.from({length:n},(_,i)=>{
      const a=(i/n)*Math.PI*2, d=60+Math.random()*130;
      return {id:Date.now()+i+Math.random(), dx:Math.cos(a)*d, dy:Math.sin(a)*d, x:cx, y:cy, color};
    });
    setParticles(p=>[...p,...ps]);
    setTimeout(()=>setParticles(p=>p.filter(x=>!ps.find(q=>q.id===x.id))),900);
  },[]);

  const triggerShake = useCallback(()=>{
    setScreenShake(true); setTimeout(()=>setScreenShake(false), 500);
  },[]);

  const triggerGlitch = useCallback(()=>{
    setGlitch(true); setTimeout(()=>setGlitch(false), 600);
  },[]);

  const showMilestone = useCallback((combo)=>{
    const msgs = {3:"🔥 STREAK x3!", 5:"🔥🔥 BLAZING x5!", 10:"🔥🔥🔥 INFERNO x10!"};
    if(msgs[combo]){ setMilestone(msgs[combo]); setTimeout(()=>setMilestone(null), 1800); }
  },[]);

  const spawnXP = useCallback((earned, correct)=>{
    const id = Date.now()+Math.random();
    const x = 40 + Math.random()*60; // % from left
    setFloatingXP(f=>[...f, {id, text: correct?`+${earned} XP`:"✗", x, correct}]);
    setTimeout(()=>setFloatingXP(f=>f.filter(p=>p.id!==id)), 1200);
  },[]);

  function calcEarned(base, timeLeft, currentCombo) {
    const tier = getStreakTier(currentCombo);
    const streakBonus = tier ? tier.bonus : 0;
    const timeBonus = Math.floor(timeLeft / 3);
    return Math.floor((base + timeBonus) * (1 + streakBonus));
  }

  function submitMC(idx){
    if(phase!=="playing") return;
    setSelected(idx); clearInterval(timerRef.current);
    const correct = idx===current.ans;
    if(correct){
      const newCombo = combo+1;
      const earned = calcEarned(100, timer, newCombo);
      const tier = getStreakTier(newCombo);
      triggerFlash("green");
      boom(CL.green,24); boom(tier?tier.color:CL.blue,12);
      setScore(s=>s+earned); setCombo(newCombo);
      toast(`⚡ ĐÚNG! +${earned} XP${tier?" "+tier.label:""}`);
      setResults(r=>[...r,{correct,earned}]);
      spawnXP(earned, true);
      showMilestone(newCombo);
      // Boom thêm nhiều hướng nếu streak cao
      if(newCombo>=10){
        setTimeout(()=>boom(CL.green,30),0);
        setTimeout(()=>boom("#FF0000",20),120);
        setTimeout(()=>boom(CL.blue,20),240);
        setTimeout(()=>boom("#FFD700",20),360);
      } else if(newCombo>=5){
        setTimeout(()=>boom(CL.green,26),0);
        setTimeout(()=>boom(CL.purple,18),150);
        setTimeout(()=>boom(CL.blue,14),300);
      } else if(newCombo>=3){
        setTimeout(()=>boom(CL.green,22),0);
        setTimeout(()=>boom(CL.blue,14),180);
      }
      // Âm thanh đúng + streak
      if(newCombo>=10) playSound("streak10");
      else if(newCombo>=5) playSound("streak5");
      else if(newCombo>=3) playSound("streak3");
      else playSound("correct");
    } else {
      triggerFlash("red"); boom(CL.red,10);
      triggerShake(); triggerGlitch();
      spawnXP(0, false);
      if(combo>=3) playSound("loseStreak"); else playSound("wrong");
      setCombo(0);
      toast("❌ Sai rồi!",true);
      setResults(r=>[...r,{correct:false,earned:0}]);
    }
    setPhase("answered");
  }

  function submitTF(){
    if(phase!=="playing") return;
    const items=current.items;
    if(items.some((_,i)=>tfSelections[i]===undefined)){ toast("Hãy chọn Đúng/Sai cho tất cả các ý!",true); return; }
    clearInterval(timerRef.current);
    const correctCount=items.filter((it,i)=>tfSelections[i]===it.correct).length;
    const allCorrect=correctCount===items.length;
    const partial=correctCount>=3;
    const base=allCorrect?150:partial?60:0;
    const newCombo = allCorrect?combo+1:0;
    const earned = base>0?calcEarned(base,timer,newCombo):0;
    const tier=getStreakTier(newCombo);
    if(allCorrect){
      triggerFlash("green"); boom(CL.green,26); boom(tier?tier.color:CL.blue,13);
      toast(`⚡ HOÀN HẢO! +${earned} XP${tier?" "+tier.label:""}`);
      setCombo(newCombo);
      if(newCombo>=10) playSound("streak10");
      else if(newCombo>=5) playSound("streak5");
      else if(newCombo>=3) playSound("streak3");
      else playSound("correct");
    } else if(partial){
      triggerFlash("green"); setCombo(0);
      toast(`✓ ${correctCount}/4 đúng · +${earned} XP`);
      playSound("correct");
    } else {
      triggerFlash("red"); boom(CL.red,10); setCombo(0);
      toast(`❌ Chỉ đúng ${correctCount}/4`,true);
      if(combo>=3) playSound("loseStreak"); else playSound("wrong");
    }
    setScore(s=>s+earned);
    setResults(r=>[...r,{correct:allCorrect,partial,earned}]);
    setSelected(true); setPhase("answered");
  }

  function next(){
    const isLast = qIdx+1>=queue.length;
    const lastResult = results[results.length-1];
    const ttype = lastResult?.correct ? "correct" : "wrong";
    setTransitionType(ttype);
    setTransitioning(true);
    setTimeout(()=>{
      setTransitioning(false);
      if(isLast){ setScreen("summary"); }
      else { setQIdx(i=>i+1); }
    }, 380);
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:CL.navy,color:"#E2E8F0",fontFamily:"'JetBrains Mono',monospace",position:"relative",overflow:"hidden",paddingBottom:40,animation:screenShake?"screenShake 0.5s ease":"none"}}>
      <style>{CSS}</style>
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(0,217,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,217,255,0.035) 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none"}}/>
      {flash&&<div style={{position:"fixed",inset:0,background:flash==="green"?"rgba(204,255,0,0.08)":"rgba(255,0,128,0.08)",pointerEvents:"none",zIndex:990}}/>}
      {/* Floating +XP */}
      {floatingXP.map(p=>(
        <div key={p.id} style={{position:"fixed",left:`${p.x}%`,top:"45%",zIndex:9998,pointerEvents:"none",
          fontFamily:"'Orbitron',monospace",fontSize:p.correct?22:18,fontWeight:900,
          color:p.correct?CL.green:CL.red,textShadow:`0 0 20px ${p.correct?CL.green:CL.red}`,
          animation:"floatUpFade 1.2s ease-out forwards",whiteSpace:"nowrap"}}>
          {p.text}
        </div>
      ))}

      {/* Glitch overlay khi sai */}
      {glitch&&(
        <div style={{position:"fixed",inset:0,zIndex:9989,pointerEvents:"none",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(255,0,128,0.04)",animation:"glitchFlash 0.6s steps(1) forwards"}}/>
          <div style={{position:"absolute",top:"30%",left:0,right:0,height:2,background:"#FF0080",opacity:0.6,animation:"glitchLine1 0.6s steps(2) forwards"}}/>
          <div style={{position:"absolute",top:"60%",left:0,right:0,height:1,background:"#FF0080",opacity:0.4,animation:"glitchLine2 0.6s steps(3) forwards"}}/>
        </div>
      )}

      {/* Milestone popup */}
      {milestone&&(
        <div style={{position:"fixed",top:"28%",left:"50%",transform:"translateX(-50%)",zIndex:9995,pointerEvents:"none",
          fontFamily:"'Orbitron',monospace",fontSize:28,fontWeight:900,letterSpacing:3,
          color:"#FFD700",textShadow:"0 0 30px #FFD700, 0 0 60px #FF8800",
          animation:"milestonePopIn 1.8s ease forwards",whiteSpace:"nowrap",textAlign:"center"}}>
          {milestone}
        </div>
      )}

      {/* Transition overlay — wipe from left */}
      {transitioning&&(
        <div style={{position:"fixed",inset:0,zIndex:9990,pointerEvents:"none",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,background:transitionType==="correct"
            ?"linear-gradient(90deg,rgba(204,255,0,0.18),rgba(0,217,255,0.10),transparent)"
            :"linear-gradient(90deg,rgba(255,0,128,0.18),rgba(255,60,0,0.10),transparent)",
            animation:"wipeRight 0.38s cubic-bezier(0.4,0,0.2,1) forwards"}}/>
          <div style={{position:"absolute",top:0,bottom:0,width:3,
            background:transitionType==="correct"?"#CCFF00":"#FF0080",
            boxShadow:transitionType==="correct"?"0 0 20px #CCFF00,0 0 40px #CCFF0088":"0 0 20px #FF0080,0 0 40px #FF008088",
            animation:"wipeLine 0.38s cubic-bezier(0.4,0,0.2,1) forwards"}}/>
        </div>
      )}
      {particles.map(p=><div key={p.id} style={{position:"fixed",left:p.x,top:p.y,width:5,height:5,borderRadius:"50%",background:p.color,boxShadow:`0 0 8px ${p.color}`,pointerEvents:"none",zIndex:9999,animation:"particlePop 0.9s ease-out forwards","--dx":p.dx+"px","--dy":p.dy+"px"}}/>)}
      <div style={{position:"fixed",top:12,right:14,zIndex:1000,display:"flex",flexDirection:"column",gap:7}}>
        {toasts.map(t=><div key={t.id} style={{background:"rgba(15,23,42,0.97)",padding:"9px 16px",border:`1px solid ${t.err?CL.red:CL.green}`,boxShadow:`0 0 10px ${t.err?CL.red:CL.green}44`,color:t.err?CL.red:CL.green,fontFamily:"'Space Mono',monospace",fontSize:11,animation:"slideIn 0.3s ease",minWidth:210}}>{t.msg}</div>)}
      </div>

      <Footer/>
      {screen==="menu"   && <Menu filterChapter={filterChapter} setFilterChapter={setFilterChapter} filterLevel={filterLevel} setFilterLevel={setFilterLevel} startGame={startGame}/>}
      {screen==="game" && current && <Game transitioning={transitioning} current={current} qIdx={qIdx} total={queue.length} score={score} combo={combo} timer={timer} phase={phase} selected={selected} tfSelections={tfSelections} toggleTF={(i,v)=>{ if(phase==="playing") setTfSelections(s=>({...s,[i]:v})); }} submitMC={submitMC} submitTF={submitTF} next={next} setScreen={setScreen}/>}
      {screen==="summary"&& <Summary results={results} score={score} total={queue.length} setScreen={setScreen} startGame={startGame}/>}
    </div>
  );
}

// ─── MENU ─────────────────────────────────────────────────────────────────────
function Menu({filterChapter,setFilterChapter,filterLevel,setFilterLevel,startGame}){
  const [hoverBtn, setHoverBtn] = useState(null);
  const isMobile = useIsMobile();
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px",gap:0,position:"relative",zIndex:1,overflowY:"auto"}}>

      {/* Decorative orbs */}
      <div style={{position:"fixed",top:"-10%",left:"-5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,217,255,0.07),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"-15%",right:"-5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(217,70,239,0.07),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",top:"40%",right:"10%",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(204,255,0,0.04),transparent 70%)",pointerEvents:"none"}}/>

      {/* Hero logo */}
      <div style={{textAlign:"center",marginBottom:32,animation:"fadeSlideIn 0.6s ease"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:isMobile?38:56,fontWeight:900,
          background:"linear-gradient(135deg,#00D9FF 0%,#D946EF 50%,#CCFF00 100%)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          letterSpacing:6,lineHeight:1,filter:"drop-shadow(0 0 30px rgba(0,217,255,0.4))"}}>
          CHEM<br/>QUEST
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginTop:12}}>
          <div style={{flex:1,maxWidth:80,height:1,background:"linear-gradient(90deg,transparent,rgba(0,217,255,0.4))"}}/>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#00D9FF99",letterSpacing:4}}>HÓA HỌC 10 - 12</div>
          <div style={{flex:1,maxWidth:80,height:1,background:"linear-gradient(90deg,rgba(0,217,255,0.4),transparent)"}}/>
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",marginBottom:28,animation:"fadeSlideIn 0.6s ease 0.1s both"}}>
        {[
          {label:isMobile?"Câu":"Câu hỏi",val:QUESTIONS.length,col:"#00D9FF",icon:"📚"},
          {label:"ABCD",val:QUESTIONS.filter(q=>q.type==="mc").length,col:"#D946EF",icon:"🎯"},
          {label:"Đúng/Sai",val:QUESTIONS.filter(q=>q.type==="tf").length,col:"#CCFF00",icon:"⚖️"},
          {label:"Chương",val:3,col:"#FF8800",icon:"📖"},
        ].map(s=>(
          <div key={s.label} style={{background:`linear-gradient(135deg,${s.col}10,${s.col}05)`,
            border:`1px solid ${s.col}33`,padding:"14px 20px",textAlign:"center",minWidth:90,
            backdropFilter:"blur(10px)",position:"relative",overflow:"hidden",borderRadius:4}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.col},transparent)`}}/>
            <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:24,color:s.col,fontWeight:900,lineHeight:1}}>{s.val}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:CL.dim,letterSpacing:1,marginTop:4}}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div style={{width:"100%",maxWidth:540,padding:isMobile?"0 4px":"0",display:"flex",flexDirection:"column",gap:isMobile?14:20,animation:"fadeSlideIn 0.6s ease 0.2s both"}}>

        {/* Streak bonuses */}
        <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(255,136,0,0.25)",padding:"16px 20px",borderRadius:4,backdropFilter:"blur(10px)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#FF8800,transparent)"}}/>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#FF8800",letterSpacing:3,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            <span>STREAK BONUS</span>
            <div style={{flex:1,height:1,background:"rgba(255,136,0,0.2)"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {STREAK_TIERS.slice().reverse().map(t=>(
              <div key={t.min} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:`${t.color}08`,border:`1px solid ${t.color}22`,borderRadius:2}}>
                <span style={{color:t.color,fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700}}>{t.label}</span>
                <span style={{color:CL.dim,fontFamily:"'Space Mono',monospace",fontSize:10,background:"rgba(0,0,0,0.3)",padding:"2px 8px",borderRadius:10}}>{t.min}+ liên tiếp</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(0,217,255,0.12)",padding:"16px 20px",borderRadius:4,backdropFilter:"blur(10px)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#00D9FF,transparent)"}}/>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#00D9FF99",letterSpacing:3,marginBottom:10}}>CHỌN CHƯƠNG</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[{label:"Tất cả",val:null,col:CL.blue},...CHAPTERS.map((ch,i)=>({label:`0${i+1}. ${ch.name}`,val:i,col:ch.color}))].map(o=>(
                  <button key={String(o.val)} style={{...btnS(filterChapter===o.val?o.col:CL.dim, filterChapter!==o.val),
                    borderColor:filterChapter===o.val?o.col+"88":"rgba(255,255,255,0.08)",
                    boxShadow:filterChapter===o.val?`0 0 12px ${o.col}44`:"none",
                    transform:"none"}} onClick={()=>{playSound("click");setFilterChapter(o.val);}}>{o.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#00D9FF99",letterSpacing:3,marginBottom:10}}>MỨC ĐỘ</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[{label:"Tất cả",val:null,col:CL.blue},...Object.entries(LEVELS).map(([lv,col])=>({label:lv,val:lv,col}))].map(o=>(
                  <button key={String(o.val)} style={{...btnS(filterLevel===o.val?o.col:CL.dim, filterLevel!==o.val),
                    borderColor:filterLevel===o.val?o.col+"88":"rgba(255,255,255,0.08)",
                    boxShadow:filterLevel===o.val?`0 0 12px ${o.col}44`:"none"}} onClick={()=>{playSound("click");setFilterLevel(o.val);}}>{o.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Start button */}
        <button
          onMouseEnter={()=>setHoverBtn("start")} onMouseLeave={()=>setHoverBtn(null)}
          style={{width:"100%",padding:"18px 0",fontFamily:"'Orbitron',monospace",fontSize:16,fontWeight:900,
            letterSpacing:5,border:"1px solid #CCFF0066",
            background:hoverBtn==="start"?"linear-gradient(135deg,#CCFF0033,#00D9FF22)":"linear-gradient(135deg,#CCFF0022,#00D9FF11)",
            color:"#CCFF00",cursor:"pointer",outline:"none",borderRadius:4,
            boxShadow:hoverBtn==="start"?"0 0 40px #CCFF0044,0 0 80px #CCFF0011":"0 0 20px #CCFF0022",
            transform:hoverBtn==="start"?"scale(1.02)":"scale(1)",
            transition:"all 0.25s",animation:"glow 2s ease-in-out infinite",
            position:"relative",overflow:"hidden"}}
          onClick={()=>{playSound("click");startGame();}}>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(204,255,0,0.05),transparent)",animation:"shimmer 2s ease-in-out infinite"}}/>
          ⚡ BẮT ĐẦU NHIỆM VỤ
        </button>

        <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:CL.dim,letterSpacing:1,textAlign:"center",paddingBottom:50}}>
          {TIMER_MAX}s mỗi câu · Tối đa 15 câu mỗi ván · Hóa Học Từ 10-12
        </div>
      </div>
    </div>
  );
}

// ─── GAME ─────────────────────────────────────────────────────────────────────
function Game({current,qIdx,total,score,combo,timer,phase,selected,transitioning,tfSelections,toggleTF,submitMC,submitTF,next,setScreen}){
  const warn = timer <= 10;
  const highStreak = combo >= 5;
  const tier = getStreakTier(combo);
  const ch = CHAPTERS[current.chapter];
  const progress = (qIdx/total)*100;
  const isMobile = useIsMobile();

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
      {/* header */}
      <div style={{display:"flex",alignItems:"center",padding:isMobile?"0 10px":"0 16px 0 20px",
        height:isMobile?48:56,background:"rgba(10,18,35,0.98)",
        borderBottom:`2px solid ${highStreak?tier.color+"66":"rgba(0,217,255,0.2)"}`,
        boxShadow:highStreak?`0 2px 20px ${tier.color}33`:"0 2px 15px rgba(0,0,0,0.5)",
        gap:isMobile?8:14,flexShrink:0,transition:"all 0.4s",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,
          background:highStreak?`linear-gradient(90deg,transparent,${tier.color},transparent)`:"linear-gradient(90deg,transparent,#00D9FF,transparent)",
          animation:"shimmer 3s ease-in-out infinite"}}/>
        {!isMobile&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:15,fontWeight:900,
          background:"linear-gradient(135deg,#00D9FF,#D946EF)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap"}}>⚗ CHEMQUEST</div>}
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:isMobile?8:9,color:CL.dim,letterSpacing:1}}>
              {isMobile?`${qIdx+1}/${total}`:`CÂU ${qIdx+1} / ${total}`}
            </span>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:CL.blue}}>{Math.round(progress)}%</span>
          </div>
          <div style={{height:isMobile?4:5,background:"rgba(255,255,255,0.06)",overflow:"hidden",borderRadius:3}}>
            <div style={{height:"100%",width:`${progress}%`,borderRadius:3,
              background:`linear-gradient(90deg,${CL.blue},${CL.purple},${CL.green})`,
              boxShadow:`0 0 10px ${CL.green}88`,transition:"width 0.5s cubic-bezier(0.4,0,0.2,1)"}}/>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:isMobile?6:12}}>
          {tier&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:isMobile?9:11,color:tier.color,
            textShadow:`0 0 12px ${tier.color}`,animation:"float 1s ease-in-out infinite",
            background:`${tier.color}15`,padding:isMobile?"2px 6px":"3px 10px",border:`1px solid ${tier.color}44`,borderRadius:2,whiteSpace:"nowrap"}}>
            {isMobile?`🔥×${combo}`:tier.label}
          </div>}
          <div style={{background:"rgba(0,217,255,0.08)",border:"1px solid rgba(0,217,255,0.2)",
            padding:isMobile?"4px 8px":"5px 12px",borderRadius:2,display:"flex",alignItems:"baseline",gap:4}}>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:isMobile?14:17,color:CL.blue,fontWeight:900}}>{score.toLocaleString()}</span>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:CL.dim}}>XP</span>
          </div>
          <button style={{...btnS(CL.dim,true,true),borderRadius:2,padding:"6px 8px"}} onClick={()=>{playSound("click");setScreen("menu");}}>✕</button>
        </div>
      </div>

      {/* body */}
      <div style={{flex:1,display:"flex",overflow:"hidden",flexDirection:isMobile?"column":"row"}}>
        {/* Mobile top bar: timer + combo */}
        {isMobile&&(
          <div style={{display:"flex",alignItems:"center",gap:0,background:"rgba(10,18,35,0.95)",
            borderBottom:"1px solid rgba(0,217,255,0.1)",flexShrink:0}}>
            {/* timer strip */}
            <div style={{flex:1,padding:"6px 12px",borderRight:"1px solid rgba(0,217,255,0.1)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:CL.dim,letterSpacing:1}}>THỜI GIAN</span>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:18,fontWeight:900,
                  color:warn?CL.red:timer<TIMER_MAX*0.5?"#FF8800":CL.blue,
                  animation:warn?"blink 0.5s ease-in-out infinite":"none"}}>{fmt(timer)}</span>
              </div>
              <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,width:`${(timer/TIMER_MAX)*100}%`,
                  background:warn?CL.red:timer<TIMER_MAX*0.5?"#FF8800":CL.blue,
                  transition:"width 1s linear"}}/>
              </div>
            </div>
            {/* combo strip */}
            <div style={{padding:"6px 14px",display:"flex",flexDirection:"column",alignItems:"center",position:"relative",minWidth:80}}>
              <FireCanvas tier={tier}/>
              <div style={{position:"relative",zIndex:2,textAlign:"center"}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:20,fontWeight:900,
                  color:tier?tier.color:CL.dim,
                  textShadow:tier?`0 0 12px ${tier.glow}`:"none",
                  animation:tier?"float 0.8s ease-in-out infinite":"none"}}>×{combo}</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:7,color:tier?tier.color:CL.dim,letterSpacing:1}}>
                  {combo>=10?"INFERNO":combo>=5?"BLAZING":combo>=3?"STREAK":"COMBO"}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* main content */}
        <div style={{flex:1,overflowY:"auto",padding:isMobile?"12px 14px":"18px 26px",display:"flex",flexDirection:"column",gap:isMobile?10:14}}>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <Tag col={ch.color} small={isMobile}>{isMobile?ch.name.toUpperCase().slice(0,8)+"..":ch.name.toUpperCase()}</Tag>
            <Tag col={LEVELS[current.level]||CL.blue} small={isMobile}>{current.level}</Tag>
            <Tag col={current.type==="tf"?CL.purple:CL.blue} small={isMobile}>{current.type==="mc"?"ABCD":"ĐÚNG/SAI"}</Tag>
          </div>

          <div style={{background:"rgba(0,0,0,0.25)",border:"1px solid rgba(0,217,255,0.12)",padding:"16px 18px",animation:transitioning?"fadeSlideOut 0.3s ease-in forwards":"fadeSlideIn 0.35s ease-out",boxShadow:phase==="playing"?"0 0 12px #00D9FF22":"none",transition:"box-shadow 0.3s"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"#00D9FF66",letterSpacing:3}}>// CÂU HỎI</div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:CL.blue,fontWeight:700}}>{String(qIdx+1).padStart(2,"0")}</div>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(0,217,255,0.2),transparent)"}}/>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:CL.dim}}>{CHAPTERS[current.chapter].name.toUpperCase()}</div>
            </div>
            <div style={{fontSize:isMobile?14:16,lineHeight:1.75,color:"#F1F5F9",fontWeight:500}}>{current.q}</div>
          </div>

          {/* MC */}
          {current.type==="mc"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {current.opts.map((opt,i)=>{
                const isSel=selected===i, isCorr=phase==="answered"&&i===current.ans, isWrong=phase==="answered"&&isSel&&i!==current.ans, isTO=phase==="timeout"&&i===current.ans;
                let bg="rgba(255,255,255,0.04)", bc="rgba(255,255,255,0.08)", tc="#94A3B8";
                if(isCorr||isTO){bg="rgba(204,255,0,0.12)";bc=CL.green;tc=CL.green;}
                else if(isWrong){bg="rgba(255,0,128,0.12)";bc=CL.red;tc=CL.red;}
                else if(isSel&&phase==="playing"){bg="rgba(0,217,255,0.1)";bc=CL.blue;tc=CL.blue;}
                return (
                  <button key={i} onClick={()=>{playSound("click");submitMC(i);}} style={{
                      display:"flex",alignItems:"flex-start",gap:isMobile?10:14,padding:isMobile?"12px 14px":"14px 18px",
                      background:bg,border:`1px solid ${bc}`,color:tc,textAlign:"left",
                      cursor:phase==="playing"?"pointer":"default",transition:"all 0.25s",
                      width:"100%",outline:"none",borderRadius:3,position:"relative",overflow:"hidden",
                      boxShadow:(isCorr||isTO)?`0 0 15px ${CL.green}33`:isWrong?`0 0 15px ${CL.red}33`:"none",
                      transform:phase==="playing"?"none":"none"}}>
                    {(isCorr||isTO)&&<div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,${CL.green}08,transparent)`,pointerEvents:"none"}}/>}
                    {isWrong&&<div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,${CL.red}08,transparent)`,pointerEvents:"none"}}/>}
                    <div style={{width:28,height:28,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",
                      flexShrink:0,background:(isCorr||isTO)?CL.green+"22":isWrong?CL.red+"22":"rgba(255,255,255,0.05)",
                      border:`1px solid ${(isCorr||isTO)?CL.green:isWrong?CL.red:bc}`,
                      fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:900,
                      animation:isWrong?"shakeX 0.4s ease":undefined,color:tc}}>
                      {(isCorr||isTO)?"✓":isWrong?"✗":["A","B","C","D"][i]}
                    </div>
                    <span style={{fontSize:14,lineHeight:1.65,flex:1}}>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TF */}
          {current.type==="tf"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {current.items.map((item,i)=>{
                const sel=tfSelections[i], answered=phase==="answered"||phase==="timeout";
                const isCorrect=answered&&sel===item.correct, isWrong=answered&&sel!==undefined&&sel!==item.correct;
                return (
                  <div key={i} style={{background:answered?(isCorrect?"rgba(204,255,0,0.07)":isWrong?"rgba(255,0,128,0.07)":"rgba(0,0,0,0.2)"):"rgba(0,0,0,0.2)",border:`1px solid ${answered?(isCorrect?CL.green:isWrong?CL.red:"rgba(255,255,255,0.08)"):"rgba(255,255,255,0.08)"}`,padding:"11px 15px"}}>
                    <div style={{fontSize:13,color:"#CBD5E1",lineHeight:1.65,marginBottom:9}}>
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:CL.blue,marginRight:8}}>{String.fromCharCode(97+i)})</span>{item.text}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {[true,false].map(val=>{
                        const isSel=sel===val, ok=val===item.correct;
                        let bg="rgba(255,255,255,0.04)",bc="rgba(255,255,255,0.1)",tc=CL.dim;
                        if(isSel&&!answered){bg="rgba(0,217,255,0.12)";bc=CL.blue;tc=CL.blue;}
                        if(answered&&ok){bg="rgba(204,255,0,0.12)";bc=CL.green;tc=CL.green;}
                        if(answered&&isSel&&!ok){bg="rgba(255,0,128,0.12)";bc=CL.red;tc=CL.red;}
                        return <button key={String(val)} onClick={()=>{playSound("click");toggleTF(i,val);}} style={{fontFamily:"'Space Mono',monospace",fontSize:isMobile?12:11,padding:isMobile?"9px 20px":"6px 14px",background:bg,border:`1px solid ${bc}`,color:tc,cursor:phase==="playing"?"pointer":"default",outline:"none",letterSpacing:1,borderRadius:2,minWidth:isMobile?80:60}}>{val?"ĐÚNG":"SAI"}</button>;
                      })}
                      {answered&&<span style={{marginLeft:"auto",fontSize:11,fontFamily:"'Space Mono',monospace",color:isCorrect?CL.green:CL.red,display:"flex",alignItems:"center"}}>{isCorrect?"✓ Đúng":`✗ → ${item.correct?"ĐÚNG":"SAI"}`}</span>}
                    </div>
                  </div>
                );
              })}
              {phase==="playing"&&<button style={{...btnS(CL.blue),alignSelf:"flex-start",marginTop:4}} onClick={()=>{playSound("click");submitTF();}}>⚡ KIỂM TRA</button>}
            </div>
          )}

          {(phase==="answered"||phase==="timeout")&&(
            <button style={{...btnS(CL.green),
              alignSelf:isMobile?"stretch":"flex-start",marginTop:4,
              padding:isMobile?"14px":"10px 20px",
              fontSize:isMobile?13:11,letterSpacing:isMobile?2:1,
              textAlign:"center",borderRadius:3}}
              onClick={()=>{playSound("click");next();}}>{qIdx+1<total?"TIẾP THEO ▶":"XEM KẾT QUẢ 🏆"}</button>
          )}
          {isMobile&&<div style={{height:20}}/>}
        </div>

        {/* sidebar — hidden on mobile */}
        <div style={{width:isMobile?0:210,minWidth:isMobile?0:210,borderLeft:isMobile?"none":"1px solid rgba(0,217,255,0.1)",background:"rgba(15,23,42,0.8)",padding:isMobile?"0":"14px 12px",display:isMobile?"none":"flex",flexDirection:"column",gap:12,flexShrink:0,overflowY:"auto"}}>
          {/* timer */}
          <Box label="THỜI GIAN">
            <div style={{textAlign:"center",padding:"4px 0"}}>
              <div style={{position:"relative",display:"inline-block"}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:34,fontWeight:900,
                  color:warn?CL.red:timer<TIMER_MAX*0.5?"#FF8800":CL.blue,
                  textShadow:warn?`0 0 20px ${CL.red},0 0 40px ${CL.red}66`:`0 0 15px ${CL.blue}66`,
                  animation:warn?"blink 0.5s ease-in-out infinite":"none",
                  letterSpacing:2}}>{fmt(timer)}</div>
              </div>
              {/* circular-ish timer bar */}
              <div style={{height:5,background:"rgba(255,255,255,0.06)",marginTop:8,overflow:"hidden",borderRadius:3}}>
                <div style={{height:"100%",borderRadius:3,
                  width:`${(timer/TIMER_MAX)*100}%`,
                  background:warn?`linear-gradient(90deg,${CL.red},#FF6600)`:timer<TIMER_MAX*0.5?"linear-gradient(90deg,#FF8800,#FFB300)":`linear-gradient(90deg,${CL.blue},${CL.purple})`,
                  boxShadow:warn?`0 0 8px ${CL.red}`:"0 0 6px #00D9FF88",
                  transition:"width 1s linear,background 0.5s"}}/>
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:CL.dim,marginTop:5,letterSpacing:1}}>
                {warn?"⚠ HẾT GIỜ SẮP!":timer<TIMER_MAX*0.5?"⏳ NỬA THỜI GIAN":"⏱ CÒN NHIỀU THỜI GIAN"}
              </div>
            </div>
          </Box>

          {/* COMBO + FIRE */}
          <Box label="STREAK">
            <div style={{textAlign:"center",position:"relative",paddingBottom:8}}>
              <FireCanvas tier={tier}/>
              <div style={{position:"relative",zIndex:2}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:34,fontWeight:900,color:tier?tier.color:CL.mid,textShadow:tier?`0 0 18px ${tier.glow}`:"none",transition:"all 0.4s",animation:tier?"float 0.8s ease-in-out infinite":"none"}}>×{combo}</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:tier?tier.color:CL.dim,letterSpacing:1,marginTop:2}}>
                  {combo>=10?"🔥🔥🔥 INFERNO":combo>=5?"🔥🔥 BLAZING":combo>=3?"🔥 STREAK":combo===1?"CHUỖI BẮT ĐẦU":"CHƯA CÓ"}
                </div>
                {tier&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:tier.color,marginTop:3,animation:"blink 1s ease-in-out infinite"}}>+{(tier.bonus*100).toFixed(0)}% ĐIỂM MỖI CÂU</div>}
              </div>
            </div>
          </Box>

          {/* score */}
          <Box label="ĐIỂM SỐ">
            {[["Streak",`×${combo}`,tier?tier.color:CL.dim],["Bonus",tier?`+${(tier.bonus*100).toFixed(0)}%`:"–",tier?tier.color:CL.dim],["Tổng",score.toLocaleString()+" XP",CL.blue]].map(([k,v,c])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:11}}>
                <span style={{color:CL.dim}}>{k}</span>
                <span style={{fontFamily:"'Space Mono',monospace",color:c,fontWeight:k==="Tổng"?700:400}}>{v}</span>
              </div>
            ))}
          </Box>

          {(phase==="answered"||phase==="timeout")&&current.type==="mc"&&(
            <Box label="ĐÁP ÁN ĐÚNG">
              <div style={{fontSize:12,color:CL.green,fontFamily:"'Space Mono',monospace",lineHeight:1.6}}>
                {["A","B","C","D"][current.ans]}. {current.opts[current.ans]}
              </div>
            </Box>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
function Summary({results,score,total,setScreen,startGame}){
  const correct=results.filter(r=>r.correct).length;
  const pct=Math.round((correct/total)*100);
  const grade=pct>=90?"XUẤT SẮC":pct>=70?"TỐT":pct>=50?"ĐẠT":"CẦN CỐ GẮNG";
  const gc=pct>=90?CL.green:pct>=70?CL.blue:pct>=50?CL.purple:CL.red;
  const gradeEmoji = pct>=90?"🏆":pct>=70?"🥇":pct>=50?"🥈":"🥉";
  const gradeMsg = pct>=90?"TUYỆT VỜI!":pct>=70?"RẤT TỐT!":pct>=50?"ĐÃ ĐẠT!":"CỐ GẮNG HỢN!";
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,padding:24,position:"relative",zIndex:1,overflowY:"auto"}}>
      {/* bg glow */}
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:600,height:600,borderRadius:"50%",background:`radial-gradient(circle,${gc}08,transparent 70%)`,pointerEvents:"none"}}/>

      {/* Grade badge */}
      <div style={{textAlign:"center",animation:"popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)"}}>
        <div style={{fontSize:64,marginBottom:8,filter:`drop-shadow(0 0 20px ${gc})`}}>{gradeEmoji}</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:42,fontWeight:900,color:gc,
          textShadow:`0 0 30px ${gc},0 0 60px ${gc}44`,letterSpacing:4}}>{gradeMsg}</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:CL.dim,letterSpacing:3,marginTop:8}}>{grade}</div>
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center",animation:"fadeSlideIn 0.5s ease 0.2s both"}}>
        {[
          {label:"ĐIỂM SỐ",val:score.toLocaleString()+" XP",col:CL.blue,sub:"tổng cộng"},
          {label:"CHÍNH XÁC",val:`${correct}/${total}`,col:CL.green,sub:"câu đúng"},
          {label:"TỈ LỆ",val:`${pct}%`,col:gc,sub:"thành công"},
        ].map(s=>(
          <div key={s.label} style={{background:`linear-gradient(135deg,${s.col}12,${s.col}05)`,
            border:`1px solid ${s.col}44`,padding:"20px 28px",textAlign:"center",minWidth:120,
            borderRadius:4,position:"relative",overflow:"hidden",animation:"fadeSlideIn 0.4s ease both"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,transparent,${s.col},transparent)`}}/>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:28,color:s.col,fontWeight:900,lineHeight:1}}>{s.val}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:CL.dim,letterSpacing:2,marginTop:6}}>{s.label}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:s.col+"88",marginTop:3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Results grid */}
      <div style={{width:"100%",maxWidth:520,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.06)",padding:"16px 20px",borderRadius:4,animation:"fadeSlideIn 0.5s ease 0.3s both"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:CL.dim,letterSpacing:3}}>KẾT QUẢ TỪNG CÂU</div>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}}/>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:CL.green}}>{correct} đúng</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:CL.red,marginLeft:8}}>{total-correct} sai</div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {results.map((r,i)=>(
            <div key={i} title={`Câu ${i+1}: ${r.correct?"Đúng":r.partial?"Một phần":"Sai"}`}
              style={{width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",
              background:r.correct?`${CL.green}18`:r.partial?`${CL.blue}12`:`${CL.red}12`,
              border:`1px solid ${r.correct?CL.green:r.partial?CL.blue:CL.red}55`,
              fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,
              color:r.correct?CL.green:r.partial?CL.blue:CL.red,
              borderRadius:2,boxShadow:r.correct?`0 0 8px ${CL.green}22`:"none",
              animation:`fadeSlideIn 0.3s ease ${i*0.03}s both`}}>
              {r.correct?"✓":r.partial?"~":"✗"}
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div style={{display:"flex",gap:12,animation:"fadeSlideIn 0.5s ease 0.4s both",paddingBottom:60}}>
        <button style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:900,letterSpacing:3,
          padding:"14px 36px",border:`1px solid ${CL.green}66`,borderRadius:3,
          background:`linear-gradient(135deg,${CL.green}22,${CL.blue}11)`,
          color:CL.green,cursor:"pointer",outline:"none",
          boxShadow:`0 0 20px ${CL.green}33`,transition:"all 0.2s"}}
          onClick={()=>{playSound("click");startGame();}}>↺ CHƠI LẠI</button>
        <button style={{...btnS(CL.dim,true)}} onClick={()=>{playSound("click");setScreen("menu");}}>⬅ MENU</button>
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer(){
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:100,
      background:"rgba(15,23,42,0.97)", borderTop:"1px solid rgba(0,217,255,0.15)",
      backdropFilter:"blur(12px)", padding:"8px 20px",
      display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"center", gap:6,
    }}>
      <div style={{fontFamily:"'Space Mono',monospace", fontSize:10, color:"#00D9FF", letterSpacing:1}}>
        ChemQuest © 2026 — Học Hóa Học Vừa Chơi Vừa Học
      </div>
      <div style={{fontFamily:"'Space Mono',monospace", fontSize:9, color:"#475569", letterSpacing:1, textAlign:"right"}}>
        Thiết kế &amp; Lập trình: <span style={{color:"#D946EF"}}>Chính Dlam</span>
        <span style={{color:"#475569"}}> Phụ </span>
        <span style={{color:"#D946EF"}}>Tkien</span>
        <span style={{color:"#475569"}}> · Phong cách nền: </span>
        <span style={{color:"#CCFF00"}}>Neon Glow + Interactive</span>
      </div>
    </div>
  );
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Tag({children,col,small=false}){
  return <div style={{fontFamily:"'Space Mono',monospace",fontSize:small?8:9,color:col,background:col+"15",border:`1px solid ${col}44`,padding:small?"2px 6px":"3px 9px",letterSpacing:1,borderRadius:2}}>{children}</div>;
}
function Box({label,children}){
  return (
    <div style={{background:"rgba(0,0,0,0.2)",border:"1px solid rgba(0,217,255,0.1)",padding:"11px 12px"}}>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:CL.blue,letterSpacing:2,marginBottom:9,display:"flex",alignItems:"center",gap:7}}>
        {label}<div style={{flex:1,height:1,background:"rgba(0,217,255,0.12)"}}/>
      </div>
      {children}
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html { touch-action: manipulation; }
  @keyframes particlePop { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0)} }
  @keyframes slideIn { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes popIn { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes glow { 0%,100%{box-shadow:0 0 10px #CCFF0044} 50%{box-shadow:0 0 28px #CCFF0099} }
  ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:rgba(0,217,255,0.2)}
  button:hover{opacity:0.9;transform:translateY(-1px);box-shadow:0 4px 15px rgba(0,0,0,0.3)!important}
  button:active{transform:translateY(0) scale(0.98)!important}
  @keyframes shimmer {
    0%{transform:translateX(-100%)} 100%{transform:translateX(200%)}
  }
  @keyframes wipeRight {
    0%{transform:translateX(-100%);opacity:1}
    100%{transform:translateX(100%);opacity:0}
  }
  @keyframes wipeLine {
    0%{left:-4px;opacity:0}
    10%{opacity:1}
    90%{opacity:1}
    100%{left:100%;opacity:0}
  }
  @keyframes fadeSlideOut {
    0%{transform:translateX(0);opacity:1}
    100%{transform:translateX(-40px);opacity:0}
  }
  @keyframes fadeSlideIn {
    0%{transform:translateX(40px);opacity:0}
    100%{transform:translateX(0);opacity:1}
  }
  @keyframes pulseGlow {
    0%,100%{box-shadow:0 0 8px #00D9FF44}
    50%{box-shadow:0 0 24px #00D9FF99, 0 0 48px #00D9FF33}
  }
  @keyframes shakeX {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-8px)}
    40%{transform:translateX(8px)}
    60%{transform:translateX(-5px)}
    80%{transform:translateX(5px)}
  }
  @keyframes screenShake {
    0%,100%{transform:translate(0,0) rotate(0)}
    15%{transform:translate(-4px,2px) rotate(-0.3deg)}
    30%{transform:translate(4px,-2px) rotate(0.3deg)}
    45%{transform:translate(-3px,3px) rotate(-0.2deg)}
    60%{transform:translate(3px,-1px) rotate(0.2deg)}
    75%{transform:translate(-2px,2px) rotate(0)}
    90%{transform:translate(1px,-1px) rotate(0)}
  }
  @keyframes floatUpFade {
    0%{transform:translateY(0) scale(0.8);opacity:0}
    15%{transform:translateY(-10px) scale(1.2);opacity:1}
    70%{transform:translateY(-60px) scale(1);opacity:1}
    100%{transform:translateY(-100px) scale(0.9);opacity:0}
  }
  @keyframes glitchFlash {
    0%{opacity:1;clip-path:inset(0 0 80% 0)}
    25%{opacity:0.8;clip-path:inset(20% 0 60% 0)}
    50%{opacity:1;clip-path:inset(50% 0 30% 0)}
    75%{opacity:0.6;clip-path:inset(70% 0 10% 0)}
    100%{opacity:0;clip-path:inset(100% 0 0 0)}
  }
  @keyframes glitchLine1 {
    0%{transform:translateX(0);opacity:0.7}
    33%{transform:translateX(10px);opacity:0.4}
    66%{transform:translateX(-8px);opacity:0.6}
    100%{opacity:0}
  }
  @keyframes glitchLine2 {
    0%{transform:translateX(0);opacity:0.5}
    50%{transform:translateX(-15px);opacity:0.3}
    100%{opacity:0}
  }
  @keyframes milestonePopIn {
    0%{transform:translateX(-50%) scale(0.3);opacity:0}
    12%{transform:translateX(-50%) scale(1.3);opacity:1}
    20%{transform:translateX(-50%) scale(0.95)}
    28%{transform:translateX(-50%) scale(1.05)}
    35%{transform:translateX(-50%) scale(1)}
    75%{transform:translateX(-50%) scale(1);opacity:1}
    100%{transform:translateX(-50%) scale(0.8) translateY(-30px);opacity:0}
  }
  @keyframes neonPulse {
    0%,100%{box-shadow:0 0 6px #00D9FF33,inset 0 0 6px #00D9FF11}
    50%{box-shadow:0 0 18px #00D9FF66,inset 0 0 12px #00D9FF22}
  }
  @keyframes rainbowBorder {
    0%{border-color:#00D9FF}
    25%{border-color:#D946EF}
    50%{border-color:#CCFF00}
    75%{border-color:#FF8800}
    100%{border-color:#00D9FF}
  }
`;