type int = number;

class Chip8 {
    memory: Uint8Array = new Uint8Array(4096);
    pc: int = 0x200; // program counter
    V: Uint8Array = new Uint8Array(16).fill(0); //registers
    I: int = 0;
    stack: Uint16Array = new Uint16Array(16);
    SP: int = -1; // stack pointer
    DT: int = 0; // delay timer
    ST: int = 0; // sound timer
    disp: Array<number> = new Array(64 *32).fill(0);
    key_map: Map<int, boolean>;

    constructor(canv: HTMLCanvasElement) {
        
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
                if (opcode == 0x00E0) this.disp.fill(0);
                else if (opcode == 0x00EE) this.pc = this.stack[--this.SP];
                break;
            case 0x1000:
                this.pc = nnn;
                break;
            case 0x2000:
                this.stack[++this.SP] = this.pc;
                this.pc = nnn;
                break;
            case 0x3000:
                if (this.V[x] == kk) this.pc += 2;
                break;
            case 0x4000:
                if (this.V[x] != kk) this.pc += 2;
                break;
            case 0x5000:
                if (this.V[x] == this.V[y]) this.pc += 2;
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
                if (this.V[x] != this.V[y]) this.pc += 2;
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
                if (n == 0xe && this.key_map[this.V[x]] == undefined || !this.key_map[this.V[x]]) this.pc += 2;
                if (n == 0x1 && this.key_map[this.V[x]]) this.pc += 2;
                break;
            //TODO: Finish 0xF...
            
    
        }
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

    private captureKey(up: boolean): number {
        let code;
        up ? document.onkeyup = (e) => {code = e.key.charCodeAt(0);} : document.onkeydown = (e) => {code = e.key.codePointAt(0);}
        return code;
    }
}

let fInput = document.getElementById("rom_file") as HTMLInputElement;
fInput.addEventListener('change', (e) => {
    let files = (e.target as HTMLInputElement).files as FileList;
    let reader = new FileReader();

    reader.onload = (e) => {
        console.log(reader.result as string);
    }

    reader.readAsText(files[0] as File);
})