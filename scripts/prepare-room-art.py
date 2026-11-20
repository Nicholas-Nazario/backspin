"""Regenerate passive bases and editable JSX parts from the approved SVG.

Run manually after editing public/listening-room/source.svg. Not a build dependency.
"""
from copy import deepcopy
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
source = ET.parse(ROOT / 'public/listening-room/source.svg').getroot()


def by_class(name):
    return next(node for node in source.iter() if node.get('class') == name)


def jsx(node):
    names = {'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap',
             'stroke-linejoin': 'strokeLinejoin'}
    tag = node.tag.split('}')[-1]
    attributes = ' '.join(f'{names.get(k, k)}="{v}"' for k, v in node.attrib.items() if k != 'class')
    if not len(node):
        return f'<{tag} {attributes} />'
    return f'<{tag} {attributes}>' + ''.join(jsx(child) for child in node) + f'</{tag}>'


player = by_class('player-placement')
disc = by_class('disc-projection')
arm = by_class('tonearm')
arm_parts = list(arm)[2:]
leaf = list(by_class('plant-placement'))[1:3]
slot = next(node for node in by_class('record-cabinet') if node.get('d', '').startswith('M999 844'))

parts = '/* Generated from the approved source.svg by scripts/prepare-room-art.py. */\n'
for name, nodes in [('DiscDrawing', list(disc[0])), ('ArmDrawing', arm_parts), ('LeafDrawing', leaf)]:
    drawing = ''.join(jsx(node) for node in nodes)
    args = ''
    if name == 'DiscDrawing':
        args = '{ alternate = false }: { alternate?: boolean }'
        drawing = drawing.replace('fill="#D98163"', 'fill={alternate ? "#85BCCD" : "#D98163"}')
    if name == 'LeafDrawing':
        drawing = drawing.replace('fill="#276B51"', 'fill="var(--room-leaf, #276B51)"')
        drawing = drawing.replace('stroke="#5A8C62"', 'stroke="var(--room-leaf-vein, #5A8C62)"')
    parts += f'export function {name}({args}) {{ return <>' + drawing + '</>; }\n'
(ROOT / 'app/listening/room-parts.tsx').write_text(parts)

# Keep the arm base fixed on the chassis; only the arm itself moves.
for node in arm_parts:
    arm.remove(node)
player.remove(disc)
plant = by_class('plant-placement')
for node in leaf:
    plant.remove(node)
by_class('record-cabinet').remove(slot)
for node in list(source):
    if node.get('class') == 'window-identity':
        source.remove(node)
    if node.get('class') == 'jacket-placement':
        jacket = node[0]
        elements = list(jacket)
        stand = next(i for i, child in enumerate(elements) if child.get('d', '').startswith('M160 690'))
        for child in elements[:stand]:
            jacket.remove(child)
source.find(f'{{{NS}}}title').text = 'Backspin listening nook, stationary layers'
source.find(f'{{{NS}}}desc').text = 'Original illustrated window nook and LP cabinet. Dynamic record, arm, leaf and album presentation are separate.'
# Approved four-state palettes. Recolor only app-owned illustration, never cover images.
palettes = {
    'day': {},
    'dawn': {
        '#B6D4CC': '#E6C8AF', '#90AC88': '#B4B394', '#668D70': '#859773',
        '#F0C976': '#F4BF78', '#E8EACF': '#F5DEBD', '#EFE2BF': '#E9D4B5',
        '#E4D0A2': '#D7C09D', '#DCCB9F': '#D1B994', '#F8EAC4': '#F2D4A7',
        '#D7A16B': '#C99A70',
    },
    'dusk': {
        '#B6D4CC': '#CC9F9A', '#90AC88': '#9F9992', '#668D70': '#737E74',
        '#F0C976': '#EFAD76', '#E8EACF': '#E6BCAD', '#EFE2BF': '#BCA58D',
        '#E4D0A2': '#A79078', '#DCCB9F': '#A18A73', '#F8EAC4': '#D6B191',
        '#D7A16B': '#AD825F', '#B8895B': '#987550', '#CBA272': '#B08F68',
        '#DAAF7A': '#BB9368', '#8D6545': '#76573E',
    },
    'night': {
        '#FFF6DF': '#F5EBD4', '#EFE2BF': '#33362B', '#E4D0A2': '#40392C',
        '#DCCB9F': '#3A3B2E', '#C4AF81': '#5E513E', '#D7A16B': '#77513B',
        '#F8EAC4': '#4E4430', '#AE7F51': '#60442F', '#C28E5B': '#654730',
        '#B47D50': '#51392C', '#DEB47B': '#A1875B', '#276B51': '#354C3E',
        '#5A8C62': '#446F4D', '#D97A58': '#B96B50', '#B8895B': '#775B40',
        '#CBA272': '#876C4C', '#9F744A': '#5E4834', '#604E38': '#D3BC90',
        '#65523A': '#302C23', '#DAAF7A': '#9C8059', '#8D6545': '#55412E',
        '#A9754B': '#755039', '#C5B089': '#534B39', '#B6D4CC': '#3D5059',
        '#90AC88': '#52675D', '#668D70': '#354C3E', '#D7AD77': '#8D7152',
        '#9B7B53': '#6F5A42', '#B98B59': '#72583F',
    },
}
for lighting, palette in palettes.items():
    art = deepcopy(source)
    for node in art.iter():
        for attribute in ['fill', 'stroke']:
            color = node.get(attribute)
            if color in palette:
                node.set(attribute, palette[color])
    window = next(node for node in art.iter() if node.get('class') == 'wall-window')
    sun = next(node for node in window if node.tag == f'{{{NS}}}circle')
    if lighting == 'dawn':
        sun.set('cx', '1160')
        sun.set('cy', '322')
    elif lighting == 'dusk':
        sun.set('cx', '1328')
        sun.set('cy', '316')
    elif lighting == 'night':
        sun.set('r', '23')
        sun.set('fill', '#F5EBD4')
        cloud = next(node for node in window if node.get('d', '').startswith('M1130 154'))
        window.remove(cloud)
        for x, y in [('1158', '101'), ('1245', '179')]:
            window.insert(3, ET.Element(f'{{{NS}}}circle', {'cx': x, 'cy': y, 'r': '2', 'fill': '#E4D7B3'}))
    art.find(f'{{{NS}}}title').text = f'Backspin listening nook — {lighting}'
    (ROOT / f'public/listening-room/{lighting}.svg').write_bytes(ET.tostring(art))
    compact = ET.Element(f'{{{NS}}}svg', {'viewBox': '760 525 590 210'})
    themed_player = next(node for node in art if node.get('class') == 'player-placement')
    compact.extend(deepcopy(list(themed_player)))
    (ROOT / f'public/listening-room/turntable-{lighting}.svg').write_bytes(ET.tostring(compact))

# Retain the existing daytime asset URL as an alias for older local previews.
(ROOT / 'public/listening-room/turntable.svg').write_bytes(
    (ROOT / 'public/listening-room/turntable-day.svg').read_bytes())
