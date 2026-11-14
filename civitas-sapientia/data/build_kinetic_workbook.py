from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.comments import Comment
wb=Workbook()
A=wb.active; A.title='Assumptions'
F=lambda **k: Font(name='Arial', **k)
blue=F(color='0000FF'); bold=F(bold=True); hdr=F(bold=True,color='FFFFFF'); fill=PatternFill('solid',fgColor='1F3A3A'); yel=PatternFill('solid',fgColor='FFF2CC')
thin=Border(bottom=Side(style='thin',color='BBBBBB'))
A['A1']='Civitas Sapientia: Kinetic Energy Harvest Assumptions'; A['A1'].font=F(bold=True,size=14)
A['A2']='Blue text on yellow = inputs you can change. Every result on the "Kinetic Harvest" tab recalculates from these.'; A['A2'].font=F(italic=True,color='555555')
rows=[
('City activity',None,None,None),
('People walking at any moment',30000,'people','Planning assumption: ~25% of 120,000 residents walking at peak'),
('Walking cadence',1.8,'steps / s','Typical adult walking cadence (≈100–120 steps/min)'),
('Share of sidewalks with kinetic tiles',0.25,'%','Planning assumption'),
('Vehicles moving at any moment',2700,'vehicles','Planning assumption: ~30% of a 9,000-vehicle AV fleet'),
('Braking stops per vehicle',1,'stops / min','Urban stop-and-go assumption'),
('Energy speed humps',32,'humps','4 per boulevard × 8 boulevards (as modeled in the 3D city)'),
('Vehicle passes per hump',0.5,'passes / s','Planning assumption'),
('Median wake micro-turbines',64,'turbines','As modeled in the 3D city'),
('Maglev pods in service',9,'pods','As modeled in the 3D city'),
('Seconds between stops per pod',90,'s','Planning assumption'),
('City electricity demand',72,'MW','From the city grid model (≈64–74 MW)'),
('Per-unit physics',None,None,None),
('Energy per footstep (tile)',3,'J','Electromagnetic floor tiles: roughly 2–5 J per step'),
('Vehicle mass',1600,'kg','Typical mid-size EV'),
('Vehicle speed before braking',13.9,'m/s','50 km/h urban speed'),
('Regenerative braking efficiency',0.65,'%','Typical EV regen recovery 60–70%'),
('Energy per hump pass',600,'J','Electromagnetic speed-hump harvesters: hundreds of J per pass'),
('Average power per wake turbine',60,'W','Small vertical-axis turbine in traffic wake'),
('Regenerative suspension per vehicle',80,'W','Prototype regen dampers: tens to ~100 W in city driving'),
('Maglev pod mass',22000,'kg','Planning assumption'),
('Maglev speed before station stop',25,'m/s','90 km/h'),
('Maglev regen efficiency',0.6,'%','Planning assumption'),
]
A['A4']='Assumption'; A['B4']='Value'; A['C4']='Unit'; A['D4']='Basis / source'
for c in 'ABCD': A[c+'4'].font=hdr; A[c+'4'].fill=fill
ref={}
r=5
for name,val,unit,src in rows:
    A.cell(r,1,name)
    if val is None: A.cell(r,1).font=F(bold=True,color='1F3A3A'); r+=1; continue
    c=A.cell(r,2,val); c.font=blue; c.fill=yel
    if unit=='%': c.number_format='0%'
    elif isinstance(val,float): c.number_format='#,##0.0'
    else: c.number_format='#,##0'
    A.cell(r,3,unit if unit!='%' else 'share'); A.cell(r,4,src).font=F(color='555555',size=9)
    A.cell(r,1).font=F(); A.cell(r,3).font=F()
    ref[name]=f"Assumptions!$B${r}"; r+=1
A.column_dimensions['A'].width=40; A.column_dimensions['B'].width=12; A.column_dimensions['C'].width=13; A.column_dimensions['D'].width=62
A.freeze_panes='A5'

K=wb.create_sheet('Kinetic Harvest')
K['A1']='Kinetic Harvest: People & Vehicles in Motion'; K['A1'].font=F(bold=True,size=14)
K['A2']='Conversion chain: Motion → generator / piezo (AC pulses) → rectifier (48 V DC bus) → supercaps + battery → inverter (400 V AC, 60 Hz) → Tesla relay towers'; K['A2'].font=F(italic=True,color='555555')
H=['Source','How it works','Energy per unit','Unit','Events or units per second','City-scale power (W)','City-scale power (kW)','Feeds']
for i,h in enumerate(H,1):
    c=K.cell(4,i,h); c.font=hdr; c.fill=fill; c.alignment=Alignment(wrap_text=True,vertical='center')
R=lambda n: ref[n]
src=[
('Footstep tiles','Electromagnetic floor tiles under sidewalks', f"={R('Energy per footstep (tile)')}", 'J / step', f"={R('People walking at any moment')}*{R('Walking cadence')}*{R('Share of sidewalks with kinetic tiles')}", 'Grid'),
('Energy speed humps','Electromagnetic plates pressed by passing wheels', f"={R('Energy per hump pass')}", 'J / pass', f"={R('Energy speed humps')}*{R('Vehicle passes per hump')}", 'Grid'),
('Wake micro-turbines','Median turbines spun by passing traffic', f"={R('Average power per wake turbine')}", 'W / turbine', f"={R('Median wake micro-turbines')}", 'Grid'),
('Maglev regen braking','Station storage returns braking energy', f"=0.5*{R('Maglev pod mass')}*{R('Maglev speed before station stop')}^2*{R('Maglev regen efficiency')}", 'J / stop', f"={R('Maglev pods in service')}/{R('Seconds between stops per pod')}", 'Grid'),
('Regenerative braking','Motors run as generators when vehicles slow', f"=0.5*{R('Vehicle mass')}*{R('Vehicle speed before braking')}^2*{R('Regenerative braking efficiency')}", 'J / stop', f"={R('Vehicles moving at any moment')}*{R('Braking stops per vehicle')}/60", 'Vehicle'),
('Regenerative suspension','Shock absorbers that generate on bumps', f"={R('Regenerative suspension per vehicle')}", 'W / vehicle', f"={R('Vehicles moving at any moment')}", 'Vehicle'),
]
for i,(s,how,e,u,rate,feed) in enumerate(src):
    r=5+i
    K.cell(r,1,s).font=bold; K.cell(r,2,how).font=F(size=9,color='555555')
    K.cell(r,3,e).number_format='#,##0'; K.cell(r,4,u)
    K.cell(r,5,rate).number_format='#,##0.00'
    K.cell(r,6,f"=C{r}*E{r}").number_format='#,##0'
    K.cell(r,7,f"=F{r}/1000").number_format='#,##0.0'
    K.cell(r,8,feed)
    for c in range(1,9):
        K.cell(r,c).border=thin
        if c not in (1,2): K.cell(r,c).font=F(bold=(c==1))
K['A12']='Fed to the city grid'; K['F12']='=SUMIFS(F5:F10,H5:H10,"Grid")'; K['G12']='=F12/1000'
K['A13']='Recovered inside vehicles'; K['F13']='=SUMIFS(F5:F10,H5:H10,"Vehicle")'; K['G13']='=F13/1000'
K['A14']='Total kinetic energy recovered'; K['F14']='=F12+F13'; K['G14']='=F14/1000'
K['A15']='Grid share of city demand'; K['G15']=f"=IFERROR(F12/({R('City electricity demand')}*1000000),0)"; K['G15'].number_format='0.00%'
for r in (12,13,14,15):
    K.cell(r,1).font=bold
    for c in (6,7):
        if r<15: K.cell(r,c).number_format='#,##0' if c==6 else '#,##0.0'
        K.cell(r,c).font=bold
K['A17']='Notes'; K['A17'].font=bold
notes=['Per-unit energies are physics-based estimates: kinetic energy ½·m·v² × recovery efficiency for braking; typical published ranges for tiles, humps and dampers.',
 'Regenerative braking is the largest source, but that energy mostly recharges the vehicles themselves rather than the city grid.',
 'Footstep tiles contribute little power. Their value is lighting and powering the walkways where the energy is collected.',
 'All figures are planning estimates for the Civitas Sapientia concept, not measured data. Change the blue inputs on the Assumptions tab to test scenarios.']
for i,n in enumerate(notes): K.cell(18+i,1,'• '+n).font=F(size=9,color='555555')
for col,w in zip('ABCDEFGH',[26,42,15,12,16,18,16,10]): K.column_dimensions[col].width=w
K.row_dimensions[4].height=32
for row in K.iter_rows(min_row=4,max_row=15):
    for c in row:
        if c.font.name!='Arial': c.font=F(bold=c.font.bold)
K.freeze_panes='A5'
wb.move_sheet('Kinetic Harvest',-1)
wb.save('Civitas_Kinetic_Energy_Harvest.xlsx')
