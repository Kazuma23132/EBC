// Código consolidado e com checagens para evitar erros quando elementos não existem.

(function () {
  'use strict';

  /* ---------------------------
     Helper: safe query
  ----------------------------*/
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------------------------
     Menu burger (mobile)
  ----------------------------*/
  const burger = $('#burger');
  const navLinks = $('#navLinks');
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(navLinks.classList.contains('open')));
    });
    // Fecha menu ao clicar num link dentro do nav
    $$('a', navLinks).forEach(a => a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
    }));
    // Fecha clicando fora
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !burger.contains(e.target)) {
        navLinks.classList.remove('open');
        if (burger) burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------------------
     Slider / Banner (se existir)
     - suporta next/prev, dots, auto-play, pause on hover
     - clique no slide redireciona para data-link
  ----------------------------*/
  const sliderRoot = $('#bannerSlider');
  if (sliderRoot) {
    const slides = $$('.slide', sliderRoot);
    let current = slides.findIndex(s => s.classList.contains('active'));
    if (current < 0) current = 0;

    // create dots
    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'slider-dots';
    slides.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      if (i === current) btn.classList.add('active');
      btn.addEventListener('click', () => { showSlide(i); resetAuto(); });
      dotsWrap.appendChild(btn);
    });
    sliderRoot.appendChild(dotsWrap);

    const nextBtn = $('#nextSlide');
    const prevBtn = $('#prevSlide');

    function showSlide(idx) {
      slides.forEach((s, i) => s.classList.toggle('active', i === idx));
      Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === idx));
      current = idx;
    }
    function next() { showSlide((current + 1) % slides.length); }
    function prev() { showSlide((current - 1 + slides.length) % slides.length); }

    if (nextBtn) nextBtn.addEventListener('click', () => { next(); resetAuto(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); resetAuto(); });

    slides.forEach(s => {
      s.addEventListener('click', (e) => {
        // evita clicar em botões dentro do slide
        if (e.target.closest('button')) return;
        const link = s.getAttribute('data-link');
        if (link) window.location.href = link;
      });
    });

    // keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });

    // auto-play
    let auto = setInterval(next, 6000);
    function resetAuto() { clearInterval(auto); auto = setInterval(next, 6000); }

    sliderRoot.addEventListener('mouseenter', () => clearInterval(auto));
    sliderRoot.addEventListener('mouseleave', () => resetAuto());
    sliderRoot.addEventListener('focusin', () => clearInterval(auto));
    sliderRoot.addEventListener('focusout', () => resetAuto());
  }

  /* ---------------------------
     Reveal on scroll (fade-in / slide-up)
  ----------------------------*/
  function revealOnScroll() {
    $$('.fade-in, .slide-up').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 60) el.classList.add('visible');
    });
  }
  window.addEventListener('scroll', revealOnScroll);
  window.addEventListener('resize', revealOnScroll);
  window.addEventListener('DOMContentLoaded', revealOnScroll);

  /* ---------------------------
     Phone mask
  ----------------------------*/
  function maskPhoneInput(input) {
    if (!input) return;
    input.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '');
      if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
      else if (v.length > 5) v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
      else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
      this.value = v;
    });
  }
  $$('input[name="telefone"]').forEach(maskPhoneInput);

  /* ---------------------------
     Generic form handler (front-end)
     - id: form id
     - msgId: id of element to show messages
     - successText: message to show on success
  ----------------------------*/
  function handleForm(formId, msgId, successText) {
    const form = document.getElementById(formId);
    if (!form) return;
    const msgEl = document.getElementById(msgId);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const requiredEls = Array.from(form.elements).filter(el => el.required);
      const valid = requiredEls.every(el => {
        if (el.type === 'checkbox' || el.type === 'radio') return el.checked;
        return el.value != null && String(el.value).trim() !== '';
      });
      if (!valid) {
        if (msgEl) { msgEl.textContent = 'Preencha todos os campos obrigatórios.'; msgEl.style.color = 'crimson'; }
        setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3500);
        return;
      }
      // Simula envio (substitua por fetch() para enviar a um servidor)
      if (msgEl) { msgEl.textContent = 'Enviando...'; msgEl.style.color = 'var(--muted)'; }
      setTimeout(() => {
        if (msgEl) { msgEl.textContent = successText; msgEl.style.color = 'var(--accent)'; }
        form.reset();
        setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3500);
      }, 700);
    });
  }

  // vincula formulários comuns (usar ids presentes nos HTML)
  handleForm('tourForm', 'tourMsg', 'Visita agendada! Em breve retornaremos.');
  handleForm('contactForm', 'contactMsg', 'Mensagem enviada! Em breve retornaremos.');
  handleForm('enrollForm', 'formMsg', 'Solicitação recebida! Entraremos em contato.');
  handleForm('rematriculaForm', 'rematriculaMsg', 'Solicitação de rematrícula enviada!');

  /* ---------------------------
     Contact page: lazy-load map, file preview, modal
  ----------------------------*/
  (function contactPageInit() {
    const mapWrap = $('#mapWrap');
    if (mapWrap) {
      let loaded = false;
      function loadMap() {
        if (loaded) return;
        const iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.style.border = '0';
        iframe.loading = 'lazy';
        iframe.src = 'https://www.google.com/maps?q=Rua+Exemplo+123&output=embed';
        mapWrap.innerHTML = '';
        mapWrap.appendChild(iframe);
        loaded = true;
      }
      function tryLoad() {
        const r = mapWrap.getBoundingClientRect();
        if (r.top < window.innerHeight + 200) loadMap();
      }
      window.addEventListener('scroll', tryLoad);
      window.addEventListener('DOMContentLoaded', tryLoad);
      window.addEventListener('resize', tryLoad);
    }

    const contactForm = $('#contactFormPage');
    const modal = $('#modalSuccess');
    if (contactForm) {
      const fileInput = contactForm.querySelector('input[type="file"]');
      const fileNameEl = contactForm.querySelector('.file-name');
      const msgEl = $('#contactPageMsg');

      if (fileInput && fileNameEl) {
        fileInput.addEventListener('change', () => {
          const f = fileInput.files[0];
          fileNameEl.textContent = f ? `${f.name} (${Math.round(f.size / 1024)} KB)` : '';
        });
      }

      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const requiredEls = Array.from(contactForm.elements).filter(el => el.required);
        const ok = requiredEls.every(el => el.value && String(el.value).trim() !== '');
        if (!ok) {
          if (msgEl) { msgEl.textContent = 'Preencha os campos obrigatórios.'; msgEl.style.color = 'crimson'; }
          setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3500);
          return;
        }
        if (msgEl) { msgEl.textContent = 'Enviando...'; msgEl.style.color = 'var(--muted)'; }
        setTimeout(() => {
          if (msgEl) msgEl.textContent = '';
          if (modal) modal.setAttribute('aria-hidden', 'false');
          contactForm.reset();
          if (fileNameEl) fileNameEl.textContent = '';
        }, 800);
      });
    }

    if (modal) {
      const closeBtn = modal.querySelector('.modal-close');
      const okBtn = modal.querySelector('.modal-ok');
      const hide = () => modal.setAttribute('aria-hidden', 'true');
      if (closeBtn) closeBtn.addEventListener('click', hide);
      if (okBtn) okBtn.addEventListener('click', hide);
      modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
    }
  })();

  /* ---------------------------
     Small utility: prevent double-binding on live reloads
     (useful durante desenvolvimento)
  ----------------------------*/
  window.__siteScriptLoaded = true;

})();