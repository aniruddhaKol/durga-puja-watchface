const projectRoot = require('path').resolve(__dirname, '..')
process.chdir(projectRoot)
const fs = require('fs')
const vm = require('vm')
const assert = require('node:assert/strict')
const source = fs.readFileSync('watchface/index.js', 'utf8')
const sleeping = process.argv.includes('--aod')
const level = sleeping ? 2 : 1
const imperial = process.argv.includes('--imperial')
const widgets = [], calls = [], timers = new Map()
const names = new Proxy({}, { get: (_, key) => key })
let face, timerId = 0, currentBattery = 49, batteryChanged, subscriptions = 0
const routes = ['SYSTEM_APP_HR','SYSTEM_APP_SPO2','SYSTEM_APP_WEATHER','SYSTEM_APP_CALENDAR','SYSTEM_APP_ALARM','SYSTEM_APP_COUNTDOWN']
vm.runInNewContext(source.replace(/import\s+(?:\w+\s+from|\{[^{}]*\}\s*from)\s*'[^']+'\s*/g, ''), {
  ...Object.fromEntries(routes.map(name => [name,name])),
  launchApp: options => calls.push(options), getScene: () => level, SCENE_AOD: 2,
  getDistanceUnit: () => imperial ? 1 : 0, DISTANCE_UNIT_METRIC: 0,
  getTemperatureUnit: () => imperial ? 1 : 0, TEMPERATURE_UNIT_CENTIGRADE: 0,
  setTimeout: (fn, delay) => { assert.equal(delay,180); timers.set(++timerId, fn); return timerId },
  clearTimeout: id => timers.delete(id),
  Battery: class {
    getCurrent() { return currentBattery }
    onChange(fn) { batteryChanged = fn; subscriptions++ }
    offChange(fn) { assert.equal(fn,batteryChanged); subscriptions-- }
  },
  Vibrator: class { stop() { calls.push('stop') } start(options) { assert.equal(options.mode,24); calls.push('vibrate') } },
  VIBRATOR_SCENE_SHORT_MIDDLE: 24,
  hmUI: {
    widget: names, data_type: names, prop: names, event: names,
    show_level: { ONLY_NORMAL: 1, ONAL_AOD: 2 }, align: { LEFT: 0, CENTER_H: 1 },
    createWidget: (kind, props) => {
      if(kind !== 'WIDGET_DELEGATE') assert.equal(props.show_level,level)
      const widget = { kind, ...props, events: {} }
      widgets.push(widget)
      return {
        setProperty: (key,value) => { if(key==='VISIBLE') widget.visible=value; else if(key==='LEVEL') widget.level=value; else if(key==='MORE') Object.assign(widget,value) },
        addEventListener: (key,callback) => widget.events[key]=callback
      }
    }
  },
  WatchFace: instance => { face = instance; face.build() }
})
const flush = () => { for(const [id,fn] of [...timers]) { timers.delete(id); fn() } }
const taps = widgets.filter(w => ['BUTTON','IMG_CLICK'].includes(w.kind))
assert.equal(taps.length,sleeping ? 0 : 12)
const expected = [
  ['SYSTEM_APP_HR','red'],['SYSTEM_APP_SPO2','blue'],['STEP','green'],['DISTANCE','blue'],
  ['CAL','orange'],['SYSTEM_APP_WEATHER','orange'],['SYSTEM_APP_ALARM','cream'],
  ['SYSTEM_APP_COUNTDOWN','cream'],['SYSTEM_APP_CALENDAR','blue'],['BATTERY','green'],['SUN_RISE','amber'],['SUN_SET','red']
]
for(let i=0;i<taps.length;i++) {
  const tap = taps[i]
  assert(tap.x>=0 && tap.y>=0 && tap.x+tap.w<=432 && tap.y+tap.h<=514)
  for(const other of taps.slice(i+1)) assert(!(tap.x<other.x+other.w && tap.x+tap.w>other.x && tap.y<other.y+other.h && tap.y+tap.h>other.y),'Overlapping tap areas')
  calls.length=0
  if(tap.kind==='BUTTON') {
    tap.click_func(); tap.click_func()
    assert.deepEqual(calls,['stop','vibrate'])
  } else {
    assert.equal(tap.type,expected[i][0])
    tap.events.CLICK_DOWN()
    assert.deepEqual(calls,['stop','vibrate'])
  }
  const glows = widgets.filter(w => w.src?.startsWith('press-') && w.visible)
  assert.equal(glows.length,1)
  assert.equal(glows[0].x,tap.x); assert.equal(glows[0].y,tap.y)
  assert.equal(glows[0].src,`press-${expected[i][1]}-${tap.w}x${tap.h}.png`)
  if(tap.kind==='BUTTON') {
    flush()
    assert.equal(calls.at(-1).appId,expected[i][0]); assert.equal(calls.at(-1).native,true)
  } else tap.events.CLICK_UP()
  assert.equal(glows[0].visible,false)
}
// Simulate rectangular hit testing: transparent full-screen images can block taps.
for (const tap of taps) {
  const index = widgets.indexOf(tap)
  for (const above of widgets.slice(index+1)) {
    if (above.kind === 'IMG' && above.visible !== false) {
      const bytes = fs.readFileSync('assets/432x514-amazfit-bip-max/'+above.src)
      const width=bytes.readUInt32BE(16), height=bytes.readUInt32BE(20)
      const cx=tap.x+tap.w/2, cy=tap.y+tap.h/2
      assert(!(cx>=above.x && cx<above.x+width && cy>=above.y && cy<above.y+height), 'Image above tap blocks '+(tap.type||index))
    }
  }
}
const batteryBar = widgets.find(w => w.kind==='IMG_LEVEL')
if(!sleeping) {
  const rise=widgets.find(w=>w.kind==='TEXT_IMG' && w.type==='SUN_RISE')
  const set=widgets.find(w=>w.kind==='TEXT_IMG' && w.type==='SUN_SET')
  const panel=widgets.find(w=>w.src==='sun-panel.png')
  assert.equal(rise.x,set.x);assert.equal(rise.w,set.w)
  assert.equal(rise.y+rise.h,set.y)
  assert.equal(rise.y,441); assert.equal(set.y,463) // User requested +3px.
  assert.equal(batteryBar.x,40)
  assert.equal(widgets.find(w=>w.src==='battery-outline.png').x,36)
} else {
  const batteryText=widgets.find(w=>w.kind==='TEXT_IMG' && w.type==='BATTERY')
  const batteryIcon=widgets.find(w=>w.src==='aod-battery-outline.png')
  assert.equal(batteryBar.x,50); assert.equal(batteryIcon.x,46)
  assert.equal(batteryText.align_h,0,'Battery value must retain a stable gap after its icon')
  assert(Math.abs(batteryText.y+batteryText.h/2-(batteryIcon.y+10))<=1,'AOD battery value and icon not vertically aligned')
}
for(const [value,clamped] of [[-1,0],[0,0],[19,19],[20,20],[50,50],[51,51],[100,100],[120,100]]) {
  currentBattery=value; batteryChanged(); assert.equal(batteryBar.level,clamped)
}
currentBattery=49; widgets.find(w=>w.kind==='WIDGET_DELEGATE').resume_call(); assert.equal(batteryBar.level,49)
const values = { HEART:'78',SPO2:'98',STEP:'52044',DISTANCE:imperial?'7.67':'12.34',CAL:'174',WEATHER_CURRENT:imperial?'84':'29',BATTERY:'49u',SUN_RISE:'06.12',SUN_SET:'18.09' }
if(process.argv.includes('--battery-100')) values.BATTERY='100u'
const assetRoot = 'assets/432x514-amazfit-bip-max/'
const size = file => { const data=fs.readFileSync(assetRoot+file); return [data.readUInt32BE(16),data.readUInt32BE(20)] }
const draw = []
const contour = JSON.parse(fs.readFileSync('references/display-contour.json','utf8'))
const add = (src,x,y) => {
  const [w,h] = size(src)
  assert(x>=0 && y>=0 && x+w<=432 && y+h<=514,`${src} outside screen`)
  if(y>=436) for(let row=y;row<y+h;row++) {
    const margin=src.startsWith('sun-') ? 1 : 4
    assert(x>=contour[row][0]+margin && x+w-1<=contour[row][1]-margin,`${src} crosses the rounded corner safe area at row ${row}`)
  }
  draw.push({ src,x,y })
}
if(process.argv.includes('--tap-distance') && !sleeping) taps[3].events.CLICK_DOWN()
if(process.argv.includes('--tap-date') && !sleeping) taps[8].click_func()
for(const w of widgets.filter(w=>w.show_level===level && w.visible!==false)) {
  if(w.kind==='IMG') add(w.src,w.x,w.y)
  if(w.kind==='IMG_TIME') for(const [prefix,value] of [['hour','05'],['minute','26']]) {
    let x=w[`${prefix}_startX`]
    for(const c of value) { const src=w[`${prefix}_array`][+c]; add(src,x,w[`${prefix}_startY`]); x+=size(src)[0]+w[`${prefix}_space`] }
  }
  if(w.kind==='TEXT_IMG') {
    const files=[...values[w.type]].map(c=>c==='u'?w.unit_en:c==='.'?w.dot_image:w.font_array[+c])
    const width=files.reduce((n,f)=>n+size(f)[0],0)
    assert(width<=w.w,`${w.type} value does not fit`)
    let x=w.x+(w.align_h===0 ? 0 : Math.floor((w.w-width)/2))
    for(const file of files) { add(file,x,w.y); x+=size(file)[0] }
  }
  if(w.kind==='IMG_WEEK') add(w.week_en[1],w.x,w.y)
  if(w.kind==='IMG_DATE') { add(w.day_en_array[2],w.day_startX,w.day_startY); add(w.day_en_array[9],w.day_startX+size(w.day_en_array[2])[0],w.day_startY) }
  if(w.kind==='IMG_LEVEL') add(w.image_array[49],w.x,w.y)
}
if(!sleeping) taps[0].click_func()
face.onDestroy()
assert.equal(timers.size,0); assert.equal(subscriptions,0)
fs.writeFileSync(sleeping?'previews/aod-preview-layout.json':'previews/preview-layout.json',JSON.stringify(draw))
console.log(`Passed ${sleeping?'AOD':'awake'} scene: ${taps.length} routes, feedback, lifecycle, battery updates and ${draw.length} image placements (${imperial?'imperial':'metric'}).`)
