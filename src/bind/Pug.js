import pug from 'pug';

export const compileFileImpl = function(templatePath, options) {
  return pug.renderFile(templatePath, options);
};

export const renderImpl = function(template, data) {
  return pug.render(template, data);
};
