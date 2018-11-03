const fs = require('fs');
const path = require('path');

const {ENV_DEV} = require('../../constants.json');

const ENV = process.env.NODE_ENV || ENV_DEV;
const dicomPath = path.join(process.cwd(), ENV === ENV_DEV ? '/src' : '/dist', '/assets/dicom');
const previewsPath = path.join(dicomPath, '/previews');

let files = getFiles();

module.exports = class DicomController {
  static getList(req, res) {
    if (ENV === ENV_DEV) {
      files = getFiles();
    }
    res.json(files);
  }
};

function getFiles() {
  const previews = fs.readdirSync(previewsPath);

  return fs.readdirSync(dicomPath)
    .filter(fileName => fileName !== 'previews')
    .map(fileName => {
      const name = fileName.replace(/\.[a-z]+$/, '');
      const preview = previews.find(p => p.includes(name));
      return {fileName, name, preview};
    });
}
