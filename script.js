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

function canMove() {
    if (tiles.length < N * N) return true;
    const g = {};
    tiles.forEach(t => (g[t.r + ',' + t.c] = t.v));
    return tiles.some(t => g[t.r + ',' + (t.c + 1)] === t.v || g[(t.r + 1) + ',' + t.c] === t.v);
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
    updateOver();
}

function updateOver() {
    overlay.hidden = !over;
    document.body.classList.toggle('game-over', over);
    if (!over) return;
    overMsg.textContent = saved ? 'Рекорд сохранён!' : 'Игра окончена! Счёт: ' + score;
    saveBox.hidden = saved;
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
    function persist() {
        localStorage.setItem(LS_STATE, JSON.stringify({ ...snapshot(), prev, over, saved, nextId }));
        localStorage.setItem(LS_BEST, best);
    }
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
    over = !canMove();
    render(ghosts);
    persist();
}

function undo() {
    if (!prev || over) return;
    tiles = prev.tiles;
    score = prev.score;
    prev = null;
    clearBoard();
    render();
    persist();
}

function newGame() {
    tiles = []; score = 0; prev = null; over = false; saved = false;
    clearBoard();
    spawn(1 + Math.floor(Math.random() * 3));
    render();
    persist();
}

const getLB = () => { try { return JSON.parse(localStorage.getItem(LS_LB)) || []; } catch { return []; } };

function saveRecord() {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    const list = getLB();
    list.push({ name, score, date: new Date().toISOString() });
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem(LS_LB, JSON.stringify(list.slice(0, 10)));
    saved = true;
    nameInput.value = '';
    updateOver();
    persist();
}

function openLB() {
    lbBody.innerHTML = '';
    const list = getLB();
    if (!list.length) {
        lbBody.innerHTML = '<tr><td colspan="4">Пока пусто. Стань первым!</td></tr>';
    }
    list.forEach((rec, i) => {
        const tr = document.createElement('tr');
        const date = new Date(rec.date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
        [i + 1, rec.name, rec.score, date].forEach(v => {
            const td = document.createElement('td');
            td.textContent = v;
            tr.appendChild(td);
        });
        lbBody.appendChild(tr);
    });
    modal.hidden = false;
    document.body.classList.add('modal-open');
}

function closeLB() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
}

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') return closeLB();
    if (e.target.tagName === 'INPUT' || !KEYS[e.key]) return;
    e.preventDefault();
    move(KEYS[e.key]);
    $('#restart').onclick = newGame;
    $('#restart2').onclick = newGame;
    undoBtn.onclick = undo;
    $('#save').onclick = saveRecord;
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveRecord(); });
    let sx = 0, sy = 0;
    const board = $('#board');
    board.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    board.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
        move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });

    $('#dpad').addEventListener('click', e => {
        const b = e.target.closest('[data-dir]');
        if (b) move(b.dataset.dir);
    });
    $('#lb-open').onclick = openLB;
    $('#lb-close').onclick = closeLB;
    modal.addEventListener('click', e => { if (e.target === modal) closeLB(); });
});

(function init() {
    try {
        const s = JSON.parse(localStorage.getItem(LS_STATE));
        if (s && Array.isArray(s.tiles) && s.tiles.length) {
            tiles = s.tiles; score = s.score || 0; prev = s.prev || null;
            over = !!s.over; saved = !!s.saved; nextId = s.nextId || 100;
            render();
            return;
        }
    } catch (e) {  }
    newGame();
})();