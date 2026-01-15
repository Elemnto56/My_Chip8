type int = number;

class Chip8 {
    private memory: Uint8Array = new Uint8Array(4096);
    private pc: int = 0x200; // program counter
    private V: Uint8Array = new Uint8Array(16).fill(0); //registers
    private I: int = 0;
    private stack: Uint16Array = new Uint16Array(16);
    private SP: int = -1; // stack pointer
    private DT: int = 0; // delay timer
    private ST: int = 0; // sound timer
    private disp: Array<number> = new Array(64 *32).fill(0);
    private key_map: Map<int, boolean> = new Map([
        [49, false], // starting here at 1 with the end being c
        [50, false],
        [51, false],
        [52, false],
        [113, false],
        [119, false],
        [101, false],
        [114, false],
        [97, false],
        [115, false],
        [100, false],
        [102, false],
        [122, false],
        [120, false],
        [99, false],
        [118, false]
    ]);

    constructor() {
        const fonts = [
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
            0x20, 0x60, 0x20, 0x20, 0x70, // 1
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F
        ];

        this.memory.set(fonts, 0x000);
    }

    public run(rom: File, canvas: HTMLCanvasElement): void {
        this.key_monitor();
        this.loadROM(rom);

        setInterval(() => {
            this.execute();
            this.render(canvas);
        }, 1000 / 60)
    }

    private execute(): void {
        const opcode = (this.memory[this.pc] << 8) | this.memory[this.pc+1];
        
        const x = (opcode & 0x0F00) >> 8;
        const y = (opcode & 0x00F0) >> 4;
        const nnn = opcode & 0x0FFF;
        const kk = opcode & 0x00FF;
        const n = opcode & 0x000F;

        this.pc += 2;

        switch (opcode & 0xF000) {
            case 0x0000:
                if (opcode === 0x00E0) this.disp.fill(0);
                else if (opcode === 0x00EE) this.pc = this.stack[--this.SP];
                break;
            case 0x1000:
                this.pc = nnn;
                break;
            case 0x2000:
                this.stack[++this.SP] = this.pc;
                this.pc = nnn;
                break;
            case 0x3000:
                if (this.V[x] === kk) this.pc += 2;
                break;
            case 0x4000:
                if (this.V[x] !== kk) this.pc += 2;
                break;
            case 0x5000:
                if (this.V[x] === this.V[y]) this.pc += 2;
                break;
            case 0x6000:
                this.V[x] = kk;
                break;
            case 0x7000:
                this.V[x] += kk;
                break;
            case 0x8000:
                switch (n) {
                case 0x1:
                    this.V[x] = this.V[x] | this.V[y];
                    break;
                case 0x2:
                    this.V[x] = this.V[x] & this.V[y];
                    break;
                case 0x3:
                    this.V[x] = this.V[x] ^ this.V[y];
                    break;
                case 0x4: {
                    let res = this.V[x] + this.V[y];
                    if (res > 255) this.V[0xF] = res; else {this.V[x] = res; this.V[0xF] = 0;} 
                }
                    break;
                case 0x5:
                    if (this.V[x] > this.V[y]) this.V[0xF] = 1; else this.V[0xF] = 0;
                    this.V[x] = this.V[y] - this.V[x];
                    break;
                case 0x6:
                    this.V[0xF] = this.V[x] & 0x1;
                    this.V[x] /= 2;
                    break;
                case 0x7:
                    if (this.V[y] > this.V[x]) this.V[0xF] = 1; else this.V[0xF] = 0;
                    this.V[x] = this.V[x] - this.V[y];
                    break;
                case 0xe:
                    this.V[0xF] = this.V[x] & 0x1;
                    this.V[x] *= 2;
                    break;
                }
                break;
            case 0x9000:
                if (this.V[x] !== this.V[y]) this.pc += 2;
                break;
            case 0xa000:
                this.I = nnn;
                break;
            case 0xb000:
                this.pc = nnn + this.V[0];
                break;
            case 0xc000:
                this.V[x] = Math.floor(Math.random() * 255) & kk;
                break;
            case 0xd000:
                this.drawSprite(this.V[x], this.V[y], n);
                break;
            case 0xe000:
                if ((opcode & 0x00FF) === 0x9e) if (this.key_map[this.V[x]]) this.pc += 2;       
                if ((opcode & 0x00FF) === 0xa1) if (!this.key_map[this.V[x]]) this.pc += 2;
                break;
            case 0xf000:
                switch (opcode & 0x00FF) {
                case 0x07:
                    this.V[x] = this.DT;
                    break;
                case 0x0a: {
                    let prev: Map<int, boolean> = this.key_map;
                    let found = false;
                    while (true) {
                        this.key_map.forEach((val: boolean, key: int) => {
                            if (prev[key] != this.key_map[key]) {this.V[x] = key; found = true;}
                        })
                        if (found) break;
                    }
                }
                    break;
                case 0x15: 
                    this.DT = this.V[x];                
                    break;
                case 0x18:
                    this.ST = this.V[x];
                    break;
                case 0x1e:
                    this.I += this.V[x];
                    break;
                case 0x29:
                    this.I = this.V[x] * 5;
                    break;
                case 0x33:
                    this.memory[this.I] = (this.V[x]-(this.V[x]%100))/100;
                    this.memory[this.I+1] = ((this.V[x]%100)-(this.V[x]%10))/10;
                    this.memory[this.I+2] = this.V[x]%10;
                    break;
                case 0x55:
                    for (let i=0; i < x; i++) { this.memory.set([this.V[i]], this.I); this.I++;} 
                    this.memory.set([this.V[x]], this.I);
                    this.I++;
                    break;
                case 0x65:
                    for (let i=0; i < x; i++) {this.V[i] = this.memory[this.I];this.I++;}
                    this.V[x] = this.memory[this.I];
                    this.I++;
                }
                break;
                
        }

        if (this.DT > 0) this.DT--;
        if (this.ST > 0) this.ST--;
    }

    private drawSprite(x: int, y: int, height: int): void {
        this.V[0xF] = 0; // reset collision flag

        for (let row=0; row < height; row++) {
            const spriteData = this.memory[this.I+row];

            for (let col=0; col < 8; col++) {
                if ((spriteData & (0x80 >> col)) !== 0) {
                    const px = (x + col) % 64;
                    const py = (y + row) % 32;
                    const index = py * 64 + px;

                    if (this.disp[index] === 1) this.V[0xF] = 1;

                    this.disp[index] ^= 1;
                }
            }
        }
    }

    private render(canvas: HTMLCanvasElement): void {
        const ctx = canvas.getContext("2d");
        const scale = 10;

        ctx.fillStyle = "black";
        ctx.fillRect(0,0,canvas.width, canvas.height);

        ctx.fillStyle = "white";
        for (let i=0; i < this.disp.length; i++) {
            if (this.disp[i]) {
                const x = (i % 64) * scale;
                const y = Math.floor(i / 64) * scale;
                ctx.fillRect(x, y, scale, scale);
            }
        }
    }

    private key_monitor(): void {
        document.onkeydown = (e) => {this.key_map[e.key]=true;}
        document.onkeyup = (e) => {this.key_map[e.key]=false;}
    }

    private async loadROM(file: File): Promise<void> {
        const f = await file.arrayBuffer();
        const data = new Uint8Array(f);

        this.memory.set(data, 0x200);
    }
}

let fInput = document.getElementById("rom_file") as HTMLInputElement;
let canvas = document.getElementById("canv") as HTMLCanvasElement;
fInput.addEventListener('change', (e) => {
    let files = (e.target as HTMLInputElement).files;
    let chip = new Chip8();
    chip.run(files[0], canvas);
})