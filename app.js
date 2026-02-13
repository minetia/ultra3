class MobileNexus {
    constructor() {
        this.isRunning = false;
        this.balance = 10000;
        this.leverage = 20;
    }

    log(msg, type = 'sys') {
        const term = document.getElementById('terminal');
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        term.appendChild(line);
        term.scrollTop = term.scrollHeight;
    }

    toggleAuto() {
        this.isRunning = !this.isRunning;
        const btn = document.getElementById('btn-toggle');
        const dot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');

        if (this.isRunning) {
            btn.classList.add('active');
            dot.classList.add('on');
            statusText.innerText = "AUTO-TRADING ACTIVE";
            this.log("AI 엔진 가동 시작", "sys");
        } else {
            btn.classList.remove('active');
            dot.classList.remove('on');
            statusText.innerText = "SYSTEM PAUSED";
            this.log("엔진 가동 중지", "sys");
        }
    }

    handleTrade(side) {
        if (!this.isRunning) {
            alert("시스템을 먼저 가동해주세요.");
            return;
        }
        this.log(`${side} 포지션 진입 시도 (${this.leverage}x)`, side === 'LONG' ? 'buy' : 'sell');
        // 실제 API 주문 로직 호출부
    }
}

const bot = new MobileNexus();
function toggleAuto() { bot.toggleAuto(); }
function handleTrade(side) { bot.handleTrade(side); }
function setLeverage(v) { 
    bot.leverage = v; 
    bot.log(`레버리지 설정 변경: ${v}x`);
}