import json

FIPS = {
    "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
    "10":"DE","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN",
    "19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA",
    "26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV",
    "33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH",
    "40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN",
    "48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"
}
NAMES = {
    "01":"Alabama","02":"Alaska","04":"Arizona","05":"Arkansas","06":"California",
    "08":"Colorado","09":"Connecticut","10":"Delaware","12":"Florida","13":"Georgia",
    "15":"Hawaii","16":"Idaho","17":"Illinois","18":"Indiana","19":"Iowa",
    "20":"Kansas","21":"Kentucky","22":"Louisiana","23":"Maine","24":"Maryland",
    "25":"Massachusetts","26":"Michigan","27":"Minnesota","28":"Mississippi",
    "29":"Missouri","30":"Montana","31":"Nebraska","32":"Nevada","33":"New Hampshire",
    "34":"New Jersey","35":"New Mexico","36":"New York","37":"North Carolina",
    "38":"North Dakota","39":"Ohio","40":"Oklahoma","41":"Oregon","42":"Pennsylvania",
    "44":"Rhode Island","45":"South Carolina","46":"South Dakota","47":"Tennessee",
    "48":"Texas","49":"Utah","50":"Vermont","51":"Virginia","53":"Washington",
    "54":"West Virginia","55":"Wisconsin","56":"Wyoming"
}

def decode_arc(arc, scale, translate):
    x, y = 0, 0
    coords = []
    for pt in arc:
        x += pt[0]
        y += pt[1]
        coords.append([x * scale[0] + translate[0], y * scale[1] + translate[1]])
    return coords

def get_ring(arc_indices, arcs, scale, translate):
    ring = []
    for i in arc_indices:
        seg = decode_arc(arcs[i], scale, translate) if i >= 0 else list(reversed(decode_arc(arcs[~i], scale, translate)))
        ring.extend(seg[1:] if ring else seg)
    return ring

with open("states-topo.json", "r", encoding="utf-8") as f:
    topo = json.load(f)

t = topo.get("transform", {})
scale = t.get("scale", [1, 1])
tr = t.get("translate", [0, 0])
arcs = topo["arcs"]
features = []

for obj in topo["objects"].values():
    for geom in obj["geometries"]:
        fips = str(geom["id"]).zfill(2)
        postal = FIPS.get(fips)
        if not postal:
            continue
        if geom["type"] == "Polygon":
            rings = [get_ring(r, arcs, scale, tr) for r in geom["arcs"]]
            geo = {"type": "Polygon", "coordinates": rings}
        elif geom["type"] == "MultiPolygon":
            geo = {"type": "MultiPolygon", "coordinates": [[get_ring(r, arcs, scale, tr) for r in p] for p in geom["arcs"]]}
        else:
            continue
        features.append({
            "type": "Feature",
            "properties": {"postal": postal, "name": NAMES.get(fips, postal)},
            "geometry": geo,
        })

with open("static/data/us-states.geojson", "w", encoding="utf-8") as f:
    json.dump({"type": "FeatureCollection", "features": features}, f)

print(f"Done: {len(features)} states")
