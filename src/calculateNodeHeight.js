const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isIE = browser ? !!document.documentElement.currentStyle : false;

const HIDDEN_TEXTAREA_STYLE = {
  'min-height': '0',
  'max-height': 'none',
  'height': '0',
  'visibility': 'hidden',
  'overflow': 'hidden',
  'position': 'absolute',
  'z-index': '-1000',
  'top': '0',
  'right': '0'
};

const SIZING_STYLE = [
  'letter-spacing',
  'line-height',
  'font-family',
  'font-weight',
  'font-size',
  'text-rendering',
  'text-transform',
  'width',
  'text-indent',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'box-sizing'
];

let computedStyleCache = {};
let hiddenTextarea;

export default function calculateNodeHeight(uiTextNode, uid,
    useCache = false,
    minRows = null, maxRows = null) {
  if (typeof hiddenTextarea === 'undefined') {
    hiddenTextarea = document.createElement('textarea');
    document.body.appendChild(hiddenTextarea);
  } else if (hiddenTextarea.parentNode === null) {
    document.body.appendChild(hiddenTextarea);
  }

  // Copy all CSS properties that have an impact on the height of the content in
  // the textbox
  const {
    paddingSize, borderSize,
    boxSizing, sizingStyle
  } = calculateNodeStyling(uiTextNode, useCache);

  // Need to have the overflow attribute to hide the scrollbar otherwise
  // text-lines will not calculated properly as the shadow will technically be
  // narrower for content
  Object.keys(sizingStyle).forEach((key) => {
    hiddenTextarea.style[key] = sizingStyle[key];
  });
  Object.keys(HIDDEN_TEXTAREA_STYLE).forEach(key => {
    hiddenTextarea.style.setProperty(key, HIDDEN_TEXTAREA_STYLE[key], 'important');
  });
  hiddenTextarea.value = uiTextNode.value || uiTextNode.placeholder || 'x';

  let minHeight = -Infinity;
  let maxHeight = Infinity;
  let height = hiddenTextarea.scrollHeight;

  if (boxSizing === 'border-box') {
    // border-box: add border, since height = content + padding + border
    height = height + borderSize;
  } else if (boxSizing === 'content-box') {
    // remove padding, since height = content
    height = height - paddingSize;
  }

  if (minRows !== null || maxRows !== null) {
    // measure height of a textarea with a single row
    hiddenTextarea.value = 'x';
    let singleRowHeight = hiddenTextarea.scrollHeight - paddingSize;
    if (minRows !== null) {
      minHeight = singleRowHeight * minRows;
      if (boxSizing === 'border-box') {
        minHeight = minHeight + paddingSize + borderSize;
      }
      height = Math.max(minHeight, height);
    }
    if (maxRows !== null) {
      maxHeight = singleRowHeight * maxRows;
      if (boxSizing === 'border-box') {
        maxHeight = maxHeight + paddingSize + borderSize;
      }
      height = Math.min(maxHeight, height);
    }
  }
  return { height, minHeight, maxHeight };
}

function calculateNodeStyling(node, uid, useCache = false) {
  if (useCache && computedStyleCache[uid]) {
    return computedStyleCache[uid];
  }

  const style = window.getComputedStyle(node);

  let sizingStyle = SIZING_STYLE
    .reduce((obj, name) => {
      obj[name] = style.getPropertyValue(name);
      return obj;
    }, {});

  const boxSizing = sizingStyle['box-sizing'];

  // IE (Edge has already correct behaviour) returns content width as computed width
  // so we need to add manually padding and border widths
  if (isIE && boxSizing === 'border-box') {
    sizingStyle.width = (
        parseFloat(sizingStyle.width)
      + parseFloat(style['border-right-width'])
      + parseFloat(style['border-left-width'])
      + parseFloat(style['padding-right'])
      + parseFloat(style['padding-left'])
    ) + 'px';
  }

  const paddingSize = (
    parseFloat(sizingStyle['padding-bottom']) +
    parseFloat(sizingStyle['padding-top'])
  );

  const borderSize = (
    parseFloat(sizingStyle['border-bottom-width']) +
    parseFloat(sizingStyle['border-top-width'])
  );

  const nodeInfo = {
    sizingStyle,
    paddingSize,
    borderSize,
    boxSizing
  };

  if (useCache) {
    computedStyleCache[uid] = nodeInfo;
  }

  return nodeInfo;
}

export const purgeCache = uid => delete computedStyleCache[uid];
