/* One local 3D scene. Native page scrolling and visibility-gated animation. */
(() => {
  'use strict';
  const cube = document.querySelector('#spatialCube');
  const viewport = document.querySelector('#cubeViewport');
  if (!cube || !viewport) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const spatial = document.querySelector('#spatial');
  const button = document.querySelector('#cubeAutoRotate');
  const label = document.querySelector('#cubeMotionLabel');
  const controls = [...document.querySelectorAll('[data-cube-face]')];
  let angle = -23, tilt = -13, face = -1;
  let visible = false, automatic = !reducedMotion.matches;
  let drag = null, frame = 0, lastTime = null, resumeAt = 0, resumeTimer = 0;

  function paint() {
    // Set the transform directly: no inherited custom-property updates per frame.
    cube.style.transform = 'rotateX(' + tilt.toFixed(2) + 'deg) rotateY(' + angle.toFixed(2) + 'deg) rotateZ(-2deg)';
    const next = ((Math.round((-angle - 23) / 90) % 4) + 4) % 4;
    if (next === face) return;
    face = next;
    // Keep the heading and description stable while the object rotates.
    spatial.dataset.chapter = String(face);
    document.querySelector('#spatialChapter').textContent = String(face + 1).padStart(2, '0');
    controls.forEach(control => control.setAttribute('aria-pressed', String(Number(control.dataset.cubeFace) === face)));
  }
  function stopFrame() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
  }
  function tick(time) {
    frame = 0;
    if (!automatic || !visible || document.hidden || drag) return;
    const elapsed = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, .05);
    lastTime = time;
    angle -= 6 * elapsed;
    viewport.classList.add('is-rotating');
    paint();
    frame = requestAnimationFrame(tick);
  }
  function refresh() {
    clearTimeout(resumeTimer);
    resumeTimer = 0;
    button.setAttribute('aria-pressed', String(automatic));
    button.textContent = automatic ? 'Pause rotation' : 'Resume rotation';
    label.textContent = automatic ? 'SLOW AUTO ROTATION' : 'ROTATION PAUSED';
    const running = automatic && visible && !document.hidden && !drag;
    if (!running) {
      stopFrame();
      viewport.classList.remove('is-rotating');
      return;
    }
    const delay = resumeAt - performance.now();
    if (delay > 0) {
      stopFrame();
      viewport.classList.remove('is-rotating');
      resumeTimer = setTimeout(refresh, delay);
    } else if (!frame) {
      lastTime = null;
      frame = requestAnimationFrame(tick);
    }
  }
  function selectFace(index) {
    stopFrame();
    viewport.classList.remove('is-rotating');
    let turn = ((-23 - index * 90 - angle) % 360 + 360) % 360;
    if (turn > 180) turn -= 360;
    angle += turn;
    tilt = -13;
    paint();
    resumeAt = performance.now() + 5000;
    refresh();
  }
  controls.forEach(control => control.addEventListener('click', () => selectFace(Number(control.dataset.cubeFace))));
  button.addEventListener('click', () => { automatic = !automatic; resumeAt = 0; refresh(); });

  viewport.addEventListener('pointerdown', event => {
    if (event.isPrimary === false || event.button !== 0 || drag) return;
    stopFrame();
    drag = { id:event.pointerId, x:event.clientX, y:event.clientY, angle, tilt, touch:event.pointerType === 'touch' };
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
    refresh();
  });
  function moveDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    angle = drag.angle + (event.clientX - drag.x) * .55;
    if (!drag.touch) tilt = Math.max(-55, Math.min(55, drag.tilt - (event.clientY - drag.y) * .35));
  }
  viewport.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    moveDrag(event);
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; paint(); });
  }, { passive:true });
  function finishDrag(event) {
    if (!drag || (event?.pointerId !== undefined && event.pointerId !== drag.id)) return;
    const id = drag.id;
    if (event?.type === 'pointercancel') { angle = drag.angle; tilt = drag.tilt; }
    else if (event?.type === 'pointerup') moveDrag(event);
    stopFrame();
    paint();
    drag = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    resumeAt = performance.now() + 2000;
    refresh();
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => viewport.addEventListener(type, finishDrag));
  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    stopFrame();
    viewport.classList.remove('is-rotating');
    if (event.key === 'Home') { angle = -23; tilt = -13; }
    if (event.key === 'ArrowLeft') angle -= 15;
    if (event.key === 'ArrowRight') angle += 15;
    if (event.key === 'ArrowUp') tilt = Math.max(-55, tilt - 10);
    if (event.key === 'ArrowDown') tilt = Math.min(55, tilt + 10);
    paint();
    resumeAt = performance.now() + 5000;
    refresh();
  });

  const sceneObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    refresh();
  }, { threshold:.05 });
  sceneObserver.observe(document.querySelector('#spatialVisual'));

  // Decorative CSS animations sleep when their section leaves the viewport.
  const decorationObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('motion-visible', entry.isIntersecting));
  });
  document.querySelectorAll('.hero, .marquee').forEach(section => decorationObserver.observe(section));
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('page-hidden', document.hidden);
    if (document.hidden) finishDrag();
    refresh();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) automatic = false;
    refresh();
  });
  paint();
  refresh();
})();

