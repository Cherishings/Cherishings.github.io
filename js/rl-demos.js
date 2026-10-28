(() => {
  'use strict';
  if (window.rlDemosInstalled) return;
  window.rlDemosInstalled = true;
  const active = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function init() {
    for (const root of document.querySelectorAll('[data-rl-demo]')) {
      if (root.dataset.ready) continue;
      root.dataset.ready = 'true';
      const $ = selector => root.querySelector(selector);
      const set = (selector, value) => { $(selector).textContent = value; };
      let frame = 0, running = false, origin = 0;
      const type = root.dataset.rlDemo;
      if (type === 'parameters') {
        let advantage = 2, updated = false;
        function renderParameters() {
          const gradient = advantage * .5 / (.5 * .5);
          const mu = updated ? .05 * gradient : 0;
          const density = Math.exp(-Math.pow(.5 - mu, 2) / (2 * .5 * .5)) / (.5 * Math.sqrt(2 * Math.PI));
          set('[data-param-mu]', mu.toFixed(2));
          set('[data-param-density]', density.toFixed(3));
          $('[data-param-step]').disabled = updated;
          set('[data-param-explanation]', updated
            ? `已执行动作仍是 0.50。优势为 ${advantage > 0 ? '+2' : '−2'}，均值参数移到 ${mu.toFixed(2)}，当前策略对旧动作的概率密度${advantage > 0 ? '提高' : '降低'}。以后重新采样的动作分布随之改变。`
            : '经验已经记录了动作 0.50。选择这条样本的优势符号，再更新一次均值参数；观察哪一项改变。');
          set('[data-param-equation]', `g = A × (a − μ) / σ² = ${gradient > 0 ? '+' : ''}${gradient.toFixed(1)}\nμ_new = 0 + 0.05 × g = ${(.05 * gradient).toFixed(2)}${updated ? '（已更新）' : '（点击后更新）'}`);
          root.dataset.mu = mu.toFixed(2);
          root.dataset.advantage = String(advantage);
        }
        for (const button of root.querySelectorAll('[data-param-adv]')) button.addEventListener('click', () => {
          advantage = Number(button.dataset.paramAdv); updated = false;
          for (const b of root.querySelectorAll('[data-param-adv]')) b.setAttribute('aria-pressed', String(b === button));
          renderParameters();
        });
        $('[data-param-step]').addEventListener('click', () => { updated = true; renderParameters(); });
        $('[data-reset]').addEventListener('click', () => { updated = false; renderParameters(); });
        renderParameters();
        continue;
      }
      const stop = () => {
        cancelAnimationFrame(frame); running = false; active.delete(stop);
        $('[data-play]').setAttribute('aria-pressed', 'false');
        set('[data-play]', type === 'clip' ? '播放扫描' : '播放流程');
      };
      let tick;
      const play = () => {
        if (running) { stop(); return; }
        running = true; origin = performance.now(); active.add(stop);
        $('[data-play]').setAttribute('aria-pressed', 'true'); set('[data-play]', '暂停');
        const loop = now => {
          if (!root.isConnected || document.hidden) { stop(); return; }
          if (tick(now - origin)) { stop(); return; }
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
      };
      $('[data-play]').addEventListener('click', play);
      if (type === 'clip') {
        let advantage = 2, ratio = 1;
        function render() {
          const clamp = Math.max(.8, Math.min(1.2, ratio));
          const plain = ratio * advantage, bounded = clamp * advantage;
          const value = Math.min(plain, bounded);
          const plateau = advantage > 0 ? ratio > 1.2 : ratio < .8;
          const kink = Math.abs(ratio - (advantage > 0 ? 1.2 : .8)) < 1e-8;
          const low = advantage > 0 ? .6 : -3.4;
          const x = r => 53 + (r - .4) / 1.2 * 520;
          const y = v => 250 - (v - low) / 2.8 * 220;
          const path = clipped => Array.from({length:121}, (_,i) => {
            const r = .4 + i / 100, raw = r * advantage;
            const v = clipped ? Math.min(raw, Math.max(.8, Math.min(1.2,r)) * advantage) : raw;
            return `${i ? 'L' : 'M'}${x(r).toFixed(2)},${y(v).toFixed(2)}`;
          }).join(' ');
          $('[data-plain]').setAttribute('d', path(false)); $('[data-clipped]').setAttribute('d', path(true));
          $('[data-cursor]').setAttribute('x1', x(ratio)); $('[data-cursor]').setAttribute('x2', x(ratio));
          $('[data-point]').setAttribute('cx', x(ratio)); $('[data-point]').setAttribute('cy', y(value));
          set('[data-y-top]', advantage > 0 ? '3.2' : '−0.8'); set('[data-y-bottom]', advantage > 0 ? '0.8' : '−3.2');
          set('[data-ratio]', ratio.toFixed(2)); $('input').value = ratio;
          set('[data-plain-value]', plain.toFixed(2)); set('[data-value]', value.toFixed(2));
          set('[data-slope]', kink ? '拐点' : plateau ? '0' : advantage > 0 ? '+2' : '−2');
          set('[data-explanation]', kink ? '此处是分段函数的拐点，两侧斜率不同；平台从这里开始。' : plateau ? '已进入平台：继续沿这个方向改变概率，不再增加该样本的目标值。其他样本和损失项仍可能改变策略。' : advantage > 0 ? '当前取未裁剪项，斜率为 +2。提高这个动作的概率会增加目标值。' : '当前取未裁剪项，斜率为 −2。降低这个动作的概率会增加目标值。');
          set('[data-code]', `min(ρA, clamp(ρ, 0.8, 1.2)A)\n= min(${plain.toFixed(2)}, ${bounded.toFixed(2)}) = ${value.toFixed(2)}`);
          root.dataset.ratio = ratio.toFixed(2); root.dataset.value = value.toFixed(2);
        }
        $('input').addEventListener('input', event => { stop(); ratio = Number(event.target.value); render(); });
        for (const button of root.querySelectorAll('[data-adv]')) button.addEventListener('click', () => {
          stop(); advantage = Number(button.dataset.adv);
          for (const b of root.querySelectorAll('[data-adv]')) b.setAttribute('aria-pressed', String(b === button));
          render();
        });
        $('[data-reset]').addEventListener('click', () => { stop(); ratio = 1; render(); });
        tick = elapsed => {
          const t = Math.min(elapsed / 8000, 1);
          // Start at 1, visit both sides, and finish at 1. Discrete steps for reduced motion.
          const phase = reduced.matches ? Math.floor(t * 8) / 8 : t;
          ratio = Math.round((1 + .6 * Math.sin(phase * 2 * Math.PI) * Math.sign(advantage)) * 100) / 100;
          render(); return t >= 1;
        };
        render();
      } else {
        let mode = 'ppo', step = 0, previousBeat = 0;
        const flows = {
          ppo: [
            [0, '策略 v0 正在采集 A、B、C；同时记录采样时的 log probability。', 'with no_grad(): action, old_logp = actor.sample(obs)', ['v0 · A','v0 · B','v0 · C'], []],
            [1, '一批数据收齐。固定 old_logp、优势和 return，准备多轮更新。', 'storage = {obs, action, old_logp, adv, returns}', ['v0 · A','v0 · B','v0 · C'], []],
            [2, '第 1 轮优化：重新计算存下来的动作的 logp，分母仍是 v0 的 old_logp。', 'ratio = exp(logp_now - old_logp_v0)', ['v0 · A','v0 · B','v0 · C'], [0,1,2]],
            [2, '第 2 轮优化：策略参数继续变化，样本和 old_logp 不变。', 'loss = -min(ratio * adv, clamp(ratio) * adv).mean()', ['v0 · A','v0 · B','v0 · C'], [0,1,2]],
            [3, '这一轮更新结束，清空 rollout。旧批次不进入下一轮采集。', 'storage.clear()', [], []],
            [0, '更新后的策略 v1 开始采集 D、E、F，并记录自己的 old_logp。', 'collect(policy_v1)  # 新数据、新的采样概率', ['v1 · D','v1 · E','v1 · F'], []]
          ],
          sac: [
            [0, '第 0 批：执行动作，收集状态转移 A、B、C。', 'transition = (obs, action, reward, next_obs, terminated)', ['批0 · A','批0 · B','批0 · C'], []],
            [1, '写入 replay。标准 SAC 更新不需要保存 old_logp。', 'replay.add(transition)', ['批0 · A','批0 · B','批0 · C'], []],
            [2, '抽到 A、C：Q 拟合执行过的动作；actor 在这些状态上重新采样动作。', 'batch = replay.sample()\na_new, logp_new = actor.rsample(batch.obs)', ['批0 · A','批0 · B','批0 · C'], [0,2]],
            [3, '第 1 批数据到来，加入 D、E、F；旧批次继续留在 replay 中。', 'replay.add(new_transitions)  # 容量未满时保留旧数据', ['批0 · A','批0 · B','批0 · C','批1 · D','批1 · E','批1 · F'], []],
            [2, '下一次随机采样抽到旧 B 和新 E，继续训练 Q 与 actor。', 'batch = replay.sample()  # 此次包含 B 和 E', ['批0 · A','批0 · B','批0 · C','批1 · D','批1 · E','批1 · F'], [1,4]],
            [1, '更新结束，数据仍保留。容量用满后，常见环形 buffer 才覆盖最旧样本。', '保留 replay → 继续交互、采样与更新', ['批0 · A','批0 · B','批0 · C','批1 · D','批1 · E','批1 · F'], []]
          ]
        };
        function render() {
          const [phase, explanation, code, tokens, selected] = flows[mode][step];
          set('[data-step-label]', `${step + 1} / 6`); set('[data-explanation]', explanation); set('[data-code]', code);
          set('[data-buffer-label]', mode === 'ppo' ? '当前 rollout · 只在本轮更新内复用' : 'Replay buffer · 保留多批历史 transition');
          root.querySelectorAll('.rl-phases li').forEach((li,i) => {
            if (i === phase) li.setAttribute('aria-current','step'); else li.removeAttribute('aria-current');
          });
          const box = $('[data-tokens]'); box.replaceChildren();
          for (const [i, label] of tokens.entries()) {
            const token = document.createElement('span'); token.className = 'rl-token'; token.textContent = label;
            token.dataset.age = /v1|批1/.test(label) ? 'new' : 'old'; token.dataset.selected = String(selected.includes(i)); box.append(token);
          }
          if (!tokens.length) box.textContent = '空';
          root.dataset.step = step; root.dataset.mode = mode;
        }
        for (const button of root.querySelectorAll('[data-mode]')) button.addEventListener('click', () => {
          stop(); mode = button.dataset.mode; step = 0;
          for (const b of root.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b === button)); render();
        });
        $('[data-next]').addEventListener('click', () => { stop(); step = (step + 1) % 6; render(); });
        $('[data-reset]').addEventListener('click', () => { stop(); step = 0; render(); });
        $('[data-play]').addEventListener('click', () => { previousBeat = 0; if (running && step === 5) { step = 0; render(); } });
        tick = elapsed => { const beat = Math.floor(elapsed / 2200); if (beat > previousBeat) { previousBeat = beat; if (step === 5) return true; step++; render(); } return false; };
        render();
      }
    }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) for (const stop of active) stop(); });
  document.addEventListener('pjax:send', () => { for (const stop of active) stop(); });
  document.addEventListener('pjax:complete', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
