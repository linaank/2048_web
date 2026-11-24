'use strict';
const N = 4, ANIM = 130;
const LS_STATE = 'sb2048:state', LS_LB = 'sb2048:leaders', LS_BEST = 'sb2048:best';
const $ = s => document.querySelector(s);
const tilesBox = $('#tiles'), scoreEl = $('#score'), bestEl = $('#best'), undoBtn = $('#undo');
const overlay = $('#overlay'), overMsg = $('#over-msg'), saveBox = $('#save-box'), nameInput = $('#name');
const modal = $('#modal'), lbBody = $('#lb-body');

let tiles = [], score = 0, prev = null, over = false, saved = false, nextId = 1;
let best = Number(localStorage.getItem(LS_BEST)) || 0;
const els = new Map();

(function buildGrid() {
    const g = $('#grid');
    for (let i = 0; i < N * N; i++) {
        const d = document.createElement('div');
        d.className = 'cell';
        g.appendChild(d);
    }
})();

const snapshot = () => ({ tiles: tiles.map(({ id, v, r, c }) => ({ id, v, r, c })), score });

function spawn(n) {
    for (let i = 0; i < n; i++) {
        const free = [];
        for (let r = 0; r < N; r++)
            for (let c = 0; c < N; c++)
                if (!tiles.some(t => t.r === r && t.c === c)) free.push([r, c]);
        if (!free.length) return;
        const [r, c] = free[Math.floor(Math.random() * free.length)];
        tiles.push({ id: nextId++, v: Math.random() < 0.9 ? 2 : 4, r, c, isNew: true });
    }
}

const tileClass = v => 'v' + (v <= 2048 ? v : 'big');

function setPos(e, r, c) {
    e.style.setProperty('--r', r);
    e.style.setProperty('--c', c);
}

function clearBoard() {
    els.forEach(e => e.remove());
    els.clear();
    tilesBox.innerHTML = '';
}

function render(ghosts = []) {
    ghosts.forEach(g => {
        const e = els.get(g.id);
        if (!e) return;
        setPos(e, g.r, g.c);
        els.delete(g.id);
        setTimeout(() => e.remove(), ANIM);
    });
    tiles.forEach(t => {
        let e = els.get(t.id);
        if (!e) {
            e = document.createElement('div');
            e.className = 'tile ' + tileClass(t.v) + (t.isNew ? ' new' : '') + (t.merged ? ' merged' : '');
            e.textContent = t.v;
            tilesBox.appendChild(e);
            els.set(t.id, e);
        }
        setPos(e, t.r, t.c);
        delete t.isNew;
        delete t.merged;
    });
    best = Math.max(best, score);
    scoreEl.textContent = score;
    bestEl.textContent = best;
    undoBtn.disabled = !prev || over;
}

function cellOf(dir, i, j) {
    if (dir === 'left') return [i, j];
    if (dir === 'right') return [i, N - 1 - j];
    if (dir === 'up') return [j, i];
    return [N - 1 - j, i];
}

function move(dir) {
    if (over || !modal.hidden) return;
    const snap = snapshot();
    const grid = Array.from({ length: N }, () => Array(N).fill(null));
    tiles.forEach(t => (grid[t.r][t.c] = t));
    const out = [], ghosts = [];
    let gained = 0, moved = false;

    for (let i = 0; i < N; i++) {
        const line = [];
        for (let j = 0; j < N; j++) line.push(cellOf(dir, i, j));
        let groups = line.map(([r, c]) => grid[r][c]).filter(Boolean).map(t => ({ v: t.v, src: [t] }));
        for (let again = true; again;) {
            again = false;
            const next = [];
            for (let n = 0; n < groups.length; n++) {
                const g = groups[n], h = groups[n + 1];
                if (h && h.v === g.v) {
                    gained += g.v * 2;
                    next.push({ v: g.v * 2, src: [...g.src, ...h.src] });
                    n++; again = true;
                } else next.push(g);
            }
            groups = next;
        }
        groups.forEach((g, k) => {
            const [r, c] = line[k];
            if (g.src.length > 1) {
                moved = true;
                g.src.forEach(t => ghosts.push({ id: t.id, r, c }));
                out.push({ id: nextId++, v: g.v, r, c, merged: true });
            } else {
                const t = g.src[0];
                if (t.r !== r || t.c !== c) moved = true;
                t.r = r; t.c = c;
                out.push(t);
            }
        });
    }
    if (!moved) return;

    prev = snap;
    tiles = out;
    score += gained;
    spawn(Math.random() < 0.5 ? 1 : 2);
    render(ghosts);
}

function undo() {
    if (!prev || over) return;
    tiles = prev.tiles;
    score = prev.score;
    prev = null;
    clearBoard();
    render();
}

function newGame() {
    tiles = []; score = 0; prev = null; over = false; saved = false;
    clearBoard();
    spawn(1 + Math.floor(Math.random() * 3));
    render();
}

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || !KEYS[e.key]) return;
    e.preventDefault();
    move(KEYS[e.key]);
    $('#restart').onclick = newGame;
    $('#restart2').onclick = newGame;
    undoBtn.onclick = undo;
});

(function init() {
    newGame();
})();