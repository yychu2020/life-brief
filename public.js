(() => {
  'use strict';

  const template = document.getElementById('feedback-template');
  const feedbackLink = document.getElementById('feedback-github');
  const feedbackChannel = document.getElementById('feedback-channel');
  const feedbackStatus = document.getElementById('feedback-status');
  const triggers = new WeakMap();

  function parseRepository(value) {
    if (typeof value !== 'string') return null;
    const parts = value.split('/');
    const [owner, repository] = parts;
    if (parts.length !== 2 || !/^[a-z0-9][a-z0-9-]*$/i.test(owner) ||
        !/^[a-z0-9_.-]+$/i.test(repository) || repository === '.' || repository === '..') return null;
    return parts;
  }

  function feedbackRepository() {
    const configured = parseRepository(window.LifeBriefPublicConfig?.repository);
    if (configured) return configured;

    const pages = /^([a-z0-9-]+)\.github\.io$/i.exec(location.hostname);
    if (!pages || location.protocol !== 'https:') return null;
    const owner = pages[1];
    const firstPart = location.pathname.split('/').filter(Boolean)[0];
    const repository = !firstPart || firstPart === 'index.html' ? owner + '.github.io' : firstPart;
    return parseRepository(`${owner}/${repository}`);
  }

  const repository = feedbackRepository();
  if (repository) {
    const url = new URL(`https://github.com/${repository.join('/')}/issues/new`);
    url.searchParams.set('title', '生活折页反馈');
    url.searchParams.set('body', template.value);
    feedbackLink.href = url.href;
    feedbackLink.hidden = false;
    feedbackChannel.textContent = '反馈将在 GitHub 公开显示，提交需要 GitHub 账号。';
  }

  for (const button of document.querySelectorAll('[data-public-dialog]')) {
    const dialog = document.getElementById(button.dataset.publicDialog);
    button.addEventListener('click', () => {
      if (dialog.open) return;
      feedbackStatus.hidden = true;
      triggers.set(dialog, button);
      dialog.showModal();
    });
  }

  for (const dialog of document.querySelectorAll('.public-dialog')) {
    dialog.querySelector('[data-public-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => triggers.get(dialog)?.focus({ preventScroll: true }));
  }

  document.getElementById('feedback-copy').addEventListener('click', async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(template.value);
      copied = true;
    } catch {
      template.focus({ preventScroll: true });
      template.select();
      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }
    }
    feedbackStatus.textContent = copied ? '已复制反馈模板。' : '模板已选中，可以直接复制。';
    feedbackStatus.hidden = false;
  });
})();
