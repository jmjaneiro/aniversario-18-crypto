import sys

# Galois Field GF(2^8) with primitive polynomial 0x11d (285)
EXP = [0] * 512
LOG = [0] * 256

x = 1
for i in range(255):
    EXP[i] = x
    EXP[i + 255] = x
    LOG[x] = i
    x <<= 1
    if x & 256:
        x ^= 0x11D
LOG[0] = 0

def gf_mul(x, y):
    if x == 0 or y == 0:
        return 0
    return EXP[LOG[x] + LOG[y]]

def rs_generator_poly(ec_len):
    g = [1]
    for i in range(ec_len):
        # g = g * (x - alpha^i) = g * (x + EXP[i])
        root = EXP[i]
        new_g = [0] * (len(g) + 1)
        for j in range(len(g)):
            new_g[j] ^= gf_mul(g[j], root)
            new_g[j + 1] ^= g[j]
        g = new_g
    return g

def rs_encode(data, ec_len):
    gen = rs_generator_poly(ec_len)
    gen = list(reversed(gen)) # highest degree first
    msg = list(data) + [0] * ec_len
    for i in range(len(data)):
        lead = msg[i]
        if lead != 0:
            for j in range(len(gen)):
                msg[i + j] ^= gf_mul(lead, gen[j])
    return msg[len(data):]

def encode_qr_v4_l(text):
    # Version 4-L:
    # 62 data codewords, 18 EC codewords, 80 total codewords
    # Mode indicator: 0100 (Byte mode)
    # Character count: 8 bits for versions 1-9
    raw_data = text.encode('iso-8859-1')
    bits = '0100' + format(len(raw_data), '08b')
    for b in raw_data:
        bits += format(b, '08b')
    
    # Terminator up to 4 zeros, up to capacity 62 * 8 = 496 bits
    capacity_bits = 62 * 8
    term_len = min(4, capacity_bits - len(bits))
    bits += '0' * term_len
    
    # Pad to byte boundary
    if len(bits) % 8 != 0:
        bits += '0' * (8 - (len(bits) % 8))
    
    # Pad codewords
    pad_bytes = ['11101100', '00010001'] # 0xEC, 0x11
    pad_idx = 0
    while len(bits) < capacity_bits:
        bits += pad_bytes[pad_idx % 2]
        pad_idx += 1
    
    data_bytes = [int(bits[i:i+8], 2) for i in range(0, len(bits), 8)]
    ec_bytes = rs_encode(data_bytes, 18)
    all_codewords = data_bytes + ec_bytes
    
    # Convert all codewords to bitstring
    full_bits = ''.join(format(c, '08b') for c in all_codewords)
    # Remainder bits for Version 4: 0 remainder bits
    return full_bits

def build_matrix_v4(bitstring):
    size = 33 # Version 4 size: 33x33
    mat = [[None] * size for _ in range(size)]
    reserved = [[False] * size for _ in range(size)]
    
    # Finder patterns
    def add_finder(ox, oy):
        for y in range(7):
            for x in range(7):
                if 0 <= ox + x < size and 0 <= oy + y < size:
                    is_black = (x == 0 or x == 6 or y == 0 or y == 6 or (2 <= x <= 4 and 2 <= y <= 4))
                    mat[oy + y][ox + x] = 1 if is_black else 0
                    reserved[oy + y][ox + x] = True
        # Separator (1 module white)
        for y in range(-1, 8):
            for x in range(-1, 8):
                if x in (-1, 7) or y in (-1, 7):
                    px, py = ox + x, oy + y
                    if 0 <= px < size and 0 <= py < size:
                        mat[py][px] = 0
                        reserved[py][px] = True

    add_finder(0, 0)
    add_finder(size - 7, 0)
    add_finder(0, size - 7)
    
    # Alignment pattern for Version 4: center at row 24, col 24
    def add_alignment(cx, cy):
        for y in range(-2, 3):
            for x in range(-2, 3):
                px, py = cx + x, cy + y
                if not reserved[py][px]:
                    is_black = (abs(x) == 2 or abs(y) == 2 or (x == 0 and y == 0))
                    mat[py][px] = 1 if is_black else 0
                    reserved[py][px] = True

    add_alignment(24, 24)
    
    # Timing patterns
    for i in range(8, size - 8):
        if not reserved[6][i]:
            mat[6][i] = 1 if i % 2 == 0 else 0
            reserved[6][i] = True
        if not reserved[i][6]:
            mat[i][6] = 1 if i % 2 == 0 else 0
            reserved[i][6] = True
            
    # Dark module
    mat[size - 8][8] = 1
    reserved[size - 8][8] = True
    
    # Reserve format info areas
    # Around top-left finder
    for i in range(9):
        if not reserved[8][i]: reserved[8][i] = True
        if not reserved[i][8]: reserved[i][8] = True
    # Around top-right finder
    for i in range(size - 8, size):
        reserved[8][i] = True
    # Around bottom-left finder
    for i in range(size - 7, size):
        reserved[i][8] = True
        
    # Place data bits
    bit_idx = 0
    num_bits = len(bitstring)
    
    # Column pairs from right to left
    x = size - 1
    going_up = True
    while x > 0:
        if x == 6: # Skip vertical timing pattern column
            x -= 1
        y_range = range(size - 1, -1, -1) if going_up else range(size)
        for y in y_range:
            for dx in (0, -1):
                col = x + dx
                if not reserved[y][col]:
                    val = 0
                    if bit_idx < num_bits:
                        val = int(bitstring[bit_idx])
                        bit_idx += 1
                    mat[y][col] = val
        going_up = not going_up
        x -= 2
        
    return mat, reserved

# Mask pattern evaluation
# Let's use Mask pattern 0: (row + col) % 2 == 0
def apply_mask(mat, reserved, mask_num=0):
    size = len(mat)
    masked = [row[:] for row in mat]
    for r in range(size):
        for c in range(size):
            if not reserved[r][c]:
                invert = False
                if mask_num == 0:
                    invert = ((r + c) % 2 == 0)
                elif mask_num == 1:
                    invert = (r % 2 == 0)
                elif mask_num == 2:
                    invert = (c % 3 == 0)
                elif mask_num == 3:
                    invert = ((r + c) % 3 == 0)
                if invert:
                    masked[r][c] ^= 1
    return masked

# Format information for EC Level L (01), mask 0 (000):
# 15-bit format string with BCH(15, 5):
# Level L is binary 01, mask 0 is binary 000 -> 01000
# generator poly: x^10 + x^8 + x^5 + x^4 + x^2 + x + 1 (10100110111)
# 01000 with mask 101010000010010 gives format bits:
def get_format_bits(ec_level='L', mask=0):
    # Precomputed table of standard 15-bit format strings:
    # L, mask 0: 01000 -> 010001000100101 ^ 101010000010010 = 111011000110111
    # Let's compute precisely:
    fmt_data = 0b01000 # L = 01, mask = 000
    val = fmt_data << 10
    poly = 0b10100110111
    for i in range(14, 9, -1):
        if (val >> i) & 1:
            val ^= poly << (i - 10)
    fmt_all = ((fmt_data << 10) | val) ^ 0b101010000010010
    return format(fmt_all, '015b')

def place_format_info(mat, fmt_str):
    size = len(mat)
    # Top-left and split across right / bottom
    # Format bits 0..5 on (8, 0..5), bit 6 on (8, 7), bit 7 on (8, 8), bit 8 on (7, 8), bits 9..14 on (5..0, 8)
    coords_tl = [
        (8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 7), (8, 8),
        (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8)
    ]
    for bit, (r, c) in zip(fmt_str, coords_tl):
        mat[r][c] = int(bit)
        
    # Second copy: bits 0..6 around bottom left, bits 7..14 around top right
    # (size-1, 8) down to (size-7, 8)
    for i in range(7):
        mat[size - 1 - i][8] = int(fmt_str[i])
    # (8, size-8) to (8, size-1)
    for i in range(8):
        mat[8][size - 8 + i] = int(fmt_str[7 + i])

def generate_svg(url, out_svg_path):
    bitstring = encode_qr_v4_l(url)
    mat, reserved = build_matrix_v4(bitstring)
    masked_mat = apply_mask(mat, reserved, 0)
    fmt_str = get_format_bits('L', 0)
    place_format_info(masked_mat, fmt_str)
    
    size = len(masked_mat)
    border = 2
    view_size = size + border * 2
    
    rects = []
    for r in range(size):
        for c in range(size):
            if masked_mat[r][c] == 1:
                rects.append(f'<rect x="{c + border}" y="{r + border}" width="1.02" height="1.02" fill="#0E121C" />')
                
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_size} {view_size}" shape-rendering="crispEdges">
  <rect width="{view_size}" height="{view_size}" fill="#FFFFFF" rx="2" />
  {''.join(rects)}
</svg>'''
    with open(out_svg_path, 'w', encoding='utf-8') as f:
        f.write(svg)
    print(f"Generated QR code SVG successfully: {out_svg_path} ({size}x{size})")

if __name__ == '__main__':
    url = "https://jmjaneiro.github.io/aniversario-18-crypto/"
    out = "aniversario-18-crypto/assets/qr-code.svg"
    generate_svg(url, out)
