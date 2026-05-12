"""Convert kotak_login_flow.md to a clean PDF"""
import re
from fpdf import FPDF

MD_PATH = r"C:\Users\MOHD FAIZAM\.gemini\antigravity\brain\9fddd60d-634c-4806-8e3b-90da57fefb35\kotak_login_flow.md"
PDF_PATH = r"C:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\Kotak_Login_Flow.pdf"

def strip_non_latin(text):
    return text.encode('latin-1', errors='ignore').decode('latin-1')

def clean(text):
    # Remove mermaid
    text = re.sub(r'```mermaid.*?```', '\n[See .md file for architecture diagram]\n', text, flags=re.DOTALL)
    # File links -> plain text
    text = re.sub(r'\[([^\]]+)\]\(file:///[^\)]+\)', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    # Alerts
    text = re.sub(r'> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]', r'[\1]', text)
    text = re.sub(r'^> ', '', text, flags=re.MULTILINE)
    # Strip emojis
    text = strip_non_latin(text)
    return text

pdf = FPDF()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()

with open(MD_PATH, "r", encoding="utf-8") as f:
    raw = f.read()

content = clean(raw)
lines = content.split("\n")

in_code = False
i = 0
while i < len(lines):
    line = lines[i].rstrip()
    
    # Code blocks
    if line.strip().startswith("```"):
        if not in_code:
            in_code = True
            i += 1
            continue
        else:
            in_code = False
            pdf.ln(3)
            i += 1
            continue
    
    if in_code:
        pdf.set_font("Courier", "", 8)
        pdf.set_text_color(50, 50, 50)
        pdf.set_fill_color(240, 240, 240)
        safe = line[:95] if len(line) > 95 else line
        if not safe.strip():
            safe = " "
        pdf.cell(0, 5, "  " + safe, new_x="LMARGIN", new_y="NEXT", fill=True)
        i += 1
        continue

    # Empty line
    if not line.strip():
        pdf.ln(2)
        i += 1
        continue

    # H1
    if line.startswith("# "):
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_text_color(20, 20, 80)
        pdf.cell(0, 12, line[2:], new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
        i += 1
        continue

    # H2
    if line.startswith("## "):
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(41, 98, 255)
        pdf.cell(0, 10, line[3:], new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)
        i += 1
        continue

    # H3
    if line.startswith("### "):
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(60, 60, 60)
        pdf.cell(0, 8, line[4:], new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        i += 1
        continue

    # Table
    if "|" in line and i + 1 < len(lines) and "---" in lines[i + 1]:
        # Collect table
        tlines = []
        while i < len(lines) and "|" in lines[i]:
            tlines.append(lines[i])
            i += 1
        
        headers = [c.strip() for c in tlines[0].strip('|').split('|') if c.strip()]
        ncols = len(headers)
        col_w = min(45, (190) / max(ncols, 1))
        
        # Header row
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(41, 98, 255)
        pdf.set_text_color(255, 255, 255)
        for h in headers:
            pdf.cell(col_w, 7, h[:20], border=1, fill=True, align="C")
        pdf.ln()
        
        # Data rows
        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(0)
        for tl in tlines[2:]:
            cols = [c.strip() for c in tl.strip('|').split('|') if c.strip()]
            for ci, c in enumerate(cols[:ncols]):
                pdf.cell(col_w, 6, c[:28], border=1)
            pdf.ln()
        pdf.ln(3)
        continue

    # HR
    if line.startswith("---"):
        pdf.set_draw_color(200, 200, 200)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(4)
        i += 1
        continue

    # Normal text
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(40, 40, 40)
    
    display = re.sub(r'\*\*(.+?)\*\*', r'\1', line)
    display = re.sub(r'`(.+?)`', r'\1', display)
    
    if display.startswith("- ") or display.startswith("* "):
        pdf.cell(5)
        pdf.cell(0, 5, chr(149) + "  " + display[2:][:100], new_x="LMARGIN", new_y="NEXT")
    elif re.match(r'^\d+\.', display):
        pdf.cell(3)
        pdf.cell(0, 5, display[:100], new_x="LMARGIN", new_y="NEXT")
    else:
        if len(display) > 100:
            pdf.multi_cell(190, 5, display)
        else:
            pdf.cell(0, 5, display[:100], new_x="LMARGIN", new_y="NEXT")
    
    i += 1

pdf.output(PDF_PATH)
print(f"PDF saved: {PDF_PATH}")
