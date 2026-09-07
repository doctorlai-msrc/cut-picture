import { createCutPictureApp } from './main.js';

const root = document.querySelector('[data-cut-picture-app]');
if (root) {
  root.dataset.initialized = 'true';
  createCutPictureApp();
}
