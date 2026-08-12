#!/usr/bin/env node
/* =====================================================================
 * tools/build.js — 拆文件方案 A(docs/04,V 拍板)的零依赖拼接构建
 *
 * 源码:src/index.template.html(骨架 HTML+CSS,含 <!--INJECT:JS--> 注入点)
 *      + src/0*.js(内联 JS 按序五块,纯搬运零逻辑改动)
 * 产物:PI/index.html(与拆分前同构 —— 单个 <script>,浏览器视角不变;
 *      冒烟/gen_demo/发版流程全部不用改)
 *
 * 用法:node tools/build.js     (3 秒内,无 npm 依赖)
 * 纪律:v81 起改动一律落 src/,index.html 是构建产物 —— 直接改它会在下次
 *      构建时被覆盖(改完 src 记得重新构建 + 跑冒烟)。
 * ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const MARKER = '<!--INJECT:JS-->';

const blocks = fs.readdirSync(SRC).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
if (!blocks.length) { console.error('src/ 下没有 0*-*.js 源码块'); process.exit(1); }

const js = blocks
  .map(f => '/* ==== src/' + f + ' ==== */\n' + fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\n$/, ''))
  .join('\n');

const tpl = fs.readFileSync(path.join(SRC, 'index.template.html'), 'utf8');
if (tpl.indexOf(MARKER) < 0) { console.error('template 缺注入点 ' + MARKER); process.exit(1); }
// replace 第二参用函数:JS 源码里满是 $,字符串形式的替换会把 $& $' 当特殊符号吃掉
const out = tpl.replace(MARKER, () => '<script>\n' + js + '\n</script>');

fs.writeFileSync(path.join(ROOT, 'index.html'), out);
console.log('built index.html ←', blocks.join(' + '), '(' + out.length + ' bytes)');
