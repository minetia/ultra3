class MobileNexus {
    constructor() {
        this.socket = null;
        this.isRunning = false;
        this.wakeLock = null; // 화면 꺼짐 방지
        
        // 상태 변수
        this.balance = 10000000; // 초기 자본
        this.coinVolume = 0;
        this.avgPrice = 0;
        this.prices = []; // RSI용 버퍼
        
        // 설정 로드 (새로고침 대응)
        this.loadState();
        this.initUI();
    }

    async initUI() {
        // 버튼 이벤트
        const btn = document.getElementById('toggleBtn');
        btn.addEventListener('click', () => this.toggleSystem());
        
        // 초기 연결
        this.connectUpbit();
        
        // 이전 상태가 Running이었다면 자동 시작
        if(this.isRunning) {
            this.updateBtnUI(true);
            this.requestWakeLock();
        }
    }

    // [중요] 모바일 화면 꺼짐 방지
    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Screen Wake Lock Active');
            }
        } catch (err) {
            console.warn(`Wake Lock Error: ${err.name}, ${err.message}`);
        }
    }

    connectUpbit() {
        this.socket = new WebSocket("wss://api.upbit.com/websocket/v1");
        this.socket.binaryType = "arraybuffer";

        this.socket.onopen = () => {
            document.getElementById('connectionStatus').classList.add('active');
            const payload = [
                { ticket: "NEXUS_MOBILE" },
                { type: "ticker", codes: ["KRW-BTC"] }
            ];
            this.socket.send(JSON.stringify(payload));
        };

        this.socket.onmessage = (evt) => {
            const dec = new TextDecoder();
            const data = JSON.parse(dec.decode(evt.data));
            if(data.type === 'ticker') this.processData(data);
        };

        this.socket.onclose = () => {
            document.getElementById('connectionStatus').classList.remove('active');
            // 모바일은 끊길 확률 높음 -> 즉시 재연결 시도
            setTimeout(() => this.connectUpbit(), 1000); 
        };
    }

    processData(data) {
        const price = data.trade_price;
        
        // UI 업데이트
        document.getElementById('curPrice').innerText = price.toLocaleString();
        
        // RSI 계산 데이터 축적
        this.prices.push(price);
        if(this.prices.length > 20) this.prices.shift();
        
        const rsi = this.calculateRSI();
        document.getElementById('rsiValue').innerText = rsi.toFixed(1);

        // 자산 가치 평가
        const currentVal = this.balance + (this.coinVolume * price);
        const pnl = currentVal - 10000000;
        const pnlRate = (pnl / 10000000) * 100;

        document.getElementById('totalAsset').innerText = Math.floor(currentVal).toLocaleString();
        const pnlEl = document.getElementById('pnlInfo');
        pnlEl.innerText = `${pnl > 0 ? '+' : ''}${Math.floor(pnl).toLocaleString()} (${pnlRate.toFixed(2)}%)`;
        pnlEl.className = pnl >= 0 ? 'sub-number up' : 'sub-number down';

        // 자동매매 로직 실행
        if(this.isRunning) {
            this.logic(price, rsi);
        }
    }

    calculateRSI() {
        if(this.prices.length < 14) return 50;
        let gains = 0, losses = 0;
        for(let i=1; i<this.prices.length; i++) {
            const diff = this.prices[i] - this.prices[i-1];
            if(diff > 0) gains += diff;
            else losses -= Math.abs(diff);
        }
        const rs = gains / (losses || 1);
        return 100 - (100 / (1 + rs));
    }

    logic(price, rsi) {
        // 단순화된 로직: RSI 30 이하 매수, 5% 수익 시 매도
        if(this.coinVolume === 0 && rsi < 30) {
            this.buy(price);
        } else if (this.coinVolume > 0) {
            const profitRate = (price - this.avgPrice) / this.avgPrice;
            if(profitRate > 0.05 || profitRate < -0.03) { // 익절 5%, 손절 3%
                this.sell(price);
            }
        }
    }

    buy(price) {
        this.coinVolume = (this.balance * 0.9995) / price; // 수수료 고려
        this.balance = 0;
        this.avgPrice = price;
        this.log(`BUY: ${price.toLocaleString()}`, 'buy');
        this.saveState();
    }

    sell(price) {
        this.balance = this.coinVolume * price * 0.9995;
        const profit = ((price - this.avgPrice) / this.avgPrice) * 100;
        this.coinVolume = 0;
        this.avgPrice = 0;
        this.log(`SELL: ${price.toLocaleString()} (${profit.toFixed(2)}%)`, 'sell');
        this.saveState();
    }

    toggleSystem() {
        this.isRunning = !this.isRunning;
        this.updateBtnUI(this.isRunning);
        this.saveState();
        
        if(this.isRunning) this.requestWakeLock();
        else if(this.wakeLock) this.wakeLock.release();
    }

    updateBtnUI(running) {
        const btn = document.getElementById('toggleBtn');
        if(running) {
            btn.innerHTML = '<i class="fas fa-robot"></i> AUTOPILOT ON';
            btn.className = 'action-btn stop';
        } else {
            btn.innerHTML = '<i class="fas fa-power-off"></i> SYSTEM READY';
            btn.className = 'action-btn start';
        }
    }

    log(msg, type) {
        const box = document.getElementById('logBox');
        const div = document.createElement('div');
        div.className = `log-item ${type}`;
        div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        box.prepend(div);
    }

    saveState() {
        const state = {
            isRunning: this.isRunning,
            balance: this.balance,
            coinVolume: this.coinVolume,
            avgPrice: this.avgPrice
        };
        localStorage.setItem('nexus_mobile_state', JSON.stringify(state));
    }

    loadState() {
        const saved = localStorage.getItem('nexus_mobile_state');
        if(saved) {
            const parsed = JSON.parse(saved);
            this.isRunning = parsed.isRunning;
            this.balance = parsed.balance;
            this.coinVolume = parsed.coinVolume;
            this.avgPrice = parsed.avgPrice;
        }
    }
}

const app = new MobileNexus();
