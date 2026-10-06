const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json({ limit: "256kb" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
});

const QUIZ_SECONDS = 20;
const FISHING_COOLDOWN_SECONDS = 30;
const FISHING_WAIT_MS = 2000;
const QUIZ_REWARD = 5000;
const QUIZ_XP = 30;
const FISHING_XP = 20;
const MAX_LEVEL = 200;
const MAX_XP = (MAX_LEVEL - 1) * 100 + 25 * (MAX_LEVEL - 2) * (MAX_LEVEL - 1) / 2;
const BANK_VERSION = "normal200-v2";

const RODS = [
  { name:"나무", price:0, luck:1, bonus:[[2,0.03]] },
  { name:"돌", price:20000, luck:1.2, bonus:[[2,0.05]] },
  { name:"철", price:100000, luck:1.5, bonus:[[2,0.08]] },
  { name:"구름", price:500000, luck:2, bonus:[[3,0.02],[2,0.10]] },
  { name:"불", price:1500000, luck:3, bonus:[[3,0.04],[2,0.12]] },
  { name:"우주", price:5000000, luck:5, bonus:[[4,0.01],[3,0.06],[2,0.15]] },
  { name:"천상", price:15000000, luck:8, bonus:[[4,0.04],[3,0.10],[2,0.20]] }
];

const FISH_TABLE = [
  {name:"멸치",tier:"일반",weight:1000,base:150,min:3,max:15},{name:"피라미",tier:"일반",weight:1000,base:220,min:5,max:25},
  {name:"붕어",tier:"일반",weight:1000,base:300,min:10,max:45},{name:"고등어",tier:"일반",weight:1000,base:450,min:15,max:60},
  {name:"잉어",tier:"일반",weight:1000,base:650,min:20,max:100},{name:"메기",tier:"일반",weight:1000,base:900,min:25,max:150},
  {name:"무지개송어",tier:"희귀",weight:400,base:2500,min:20,max:90},{name:"연어",tier:"희귀",weight:400,base:3500,min:30,max:140},
  {name:"참돔",tier:"희귀",weight:400,base:5000,min:25,max:120},{name:"참치",tier:"희귀",weight:400,base:7500,min:80,max:400},
  {name:"황새치",tier:"희귀",weight:400,base:10000,min:100,max:500},{name:"월광비늘어",tier:"영웅",weight:150,base:18000,min:30,max:180},
  {name:"수정지느러미어",tier:"영웅",weight:150,base:25000,min:40,max:250},{name:"심해유령어",tier:"영웅",weight:150,base:35000,min:80,max:600},
  {name:"폭풍가오리",tier:"영웅",weight:150,base:50000,min:150,max:1000},{name:"황금용어",tier:"전설",weight:100,base:100000,min:200,max:1500},
  {name:"불사조잉어",tier:"전설",weight:100,base:150000,min:300,max:2000},{name:"별바다의 왕어",tier:"전설",weight:100,base:220000,min:500,max:3000},
  {name:"해룡",tier:"신화",weight:50,base:450000,min:1000,max:10000},{name:"레비아탄",tier:"신화",weight:50,base:700000,min:3000,max:30000}
];

const QUIZZES = [
    ["일반", "대한민국의 수도는?", ["서울", "서울특별시"]],
    ["일반", "한글을 창제한 왕은?", ["세종", "세종대왕"]],
    ["일반", "대한민국의 국기 이름은?", ["태극기"]],
    ["일반", "대한민국의 화폐 단위는?", ["원", "원화"]],
    ["일반", "대한민국의 국가 이름은?", ["애국가"]],
    ["일반", "일본의 수도는?", ["도쿄", "동경"]],
    ["일반", "중국의 수도는?", ["베이징", "북경"]],
    ["일반", "프랑스의 수도는?", ["파리"]],
    ["일반", "영국의 수도는?", ["런던"]],
    ["일반", "미국의 수도는?", ["워싱턴", "워싱턴DC", "워싱턴D.C."]],
    ["일반", "이탈리아의 수도는?", ["로마"]],
    ["일반", "독일의 수도는?", ["베를린"]],
    ["일반", "캐나다의 수도는?", ["오타와"]],
    ["일반", "호주의 수도는?", ["캔버라"]],
    ["일반", "스페인의 수도는?", ["마드리드"]],
    ["일반", "태국의 수도는?", ["방콕"]],
    ["일반", "베트남의 수도는?", ["하노이"]],
    ["일반", "인도의 수도는?", ["뉴델리"]],
    ["일반", "브라질의 수도는?", ["브라질리아"]],
    ["일반", "이집트의 수도는?", ["카이로"]],
    ["일반", "그리스의 수도는?", ["아테네"]],
    ["일반", "러시아의 수도는?", ["모스크바"]],
    ["일반", "지구의 자연 위성은?", ["달"]],
    ["일반", "태양계에서 가장 큰 행성은?", ["목성"]],
    ["일반", "태양과 가장 가까운 행성은?", ["수성"]],
    ["일반", "우리가 사는 행성은?", ["지구"]],
    ["일반", "붉은 행성이라고 불리는 행성은?", ["화성"]],
    ["일반", "뚜렷한 고리로 유명한 행성은?", ["토성"]],
    ["일반", "태양계의 중심에 있는 별은?", ["태양"]],
    ["일반", "지구가 스스로 도는 운동은?", ["자전"]],
    ["일반", "지구가 태양 주위를 도는 운동은?", ["공전"]],
    ["일반", "물의 화학식은?", ["H2O", "H₂O"]],
    ["일반", "산소의 원소 기호는?", ["O"]],
    ["일반", "수소의 원소 기호는?", ["H"]],
    ["일반", "금의 원소 기호는?", ["Au"]],
    ["일반", "은의 원소 기호는?", ["Ag"]],
    ["일반", "철의 원소 기호는?", ["Fe"]],
    ["일반", "탄소의 원소 기호는?", ["C"]],
    ["일반", "질소의 원소 기호는?", ["N"]],
    ["일반", "헬륨의 원소 기호는?", ["He"]],
    ["일반", "식물이 빛을 이용해 양분을 만드는 작용은?", ["광합성"]],
    ["일반", "물이 표면에서 수증기로 변하는 현상은?", ["증발"]],
    ["일반", "수증기가 물방울로 변하는 현상은?", ["응결", "액화"]],
    ["일반", "거미의 다리는 몇 개?", ["8", "8개", "여덟", "여덟개"]],
    ["일반", "곤충의 다리는 몇 개?", ["6", "6개", "여섯", "여섯개"]],
    ["일반", "문어의 팔은 몇 개?", ["8", "8개", "여덟", "여덟개"]],
    ["일반", "개구리의 새끼는?", ["올챙이"]],
    ["일반", "1분은 몇 초?", ["60", "60초"]],
    ["일반", "1시간은 몇 분?", ["60", "60분"]],
    ["일반", "하루는 몇 시간?", ["24", "24시간"]],
    ["일반", "일주일은 며칠?", ["7", "7일", "칠일"]],
    ["일반", "1년은 몇 개월?", ["12", "12개월"]],
    ["일반", "윤년의 2월은 며칠까지?", ["29", "29일"]],
    ["일반", "1미터는 몇 센티미터?", ["100", "100cm", "100센티미터"]],
    ["일반", "1킬로미터는 몇 미터?", ["1000", "1000m", "1000미터", "1,000"]],
    ["일반", "1킬로그램은 몇 그램?", ["1000", "1000g", "1000그램", "1,000"]],
    ["일반", "7 + 8 = ?", ["15"]],
    ["일반", "25 - 9 = ?", ["16"]],
    ["일반", "6 × 7 = ?", ["42"]],
    ["일반", "8 × 9 = ?", ["72"]],
    ["일반", "81 ÷ 9 = ?", ["9"]],
    ["일반", "12 × 12 = ?", ["144"]],
    ["일반", "100의 절반은?", ["50"]],
    ["일반", "200의 10%는?", ["20"]],
    ["일반", "3의 제곱은?", ["9"]],
    ["일반", "2의 세제곱은?", ["8"]],
    ["일반", "삼각형의 내각의 합은?", ["180", "180도"]],
    ["일반", "사각형의 내각의 합은?", ["360", "360도"]],
    ["일반", "직각은 몇 도?", ["90", "90도"]],
    ["일반", "평각은 몇 도?", ["180", "180도"]],
    ["일반", "가장 작은 소수는?", ["2"]],
    ["일반", "초성 ㅂㄴㄴ / 길쭉하고 노란 과일", ["바나나"]],
    ["일반", "초성 ㅅㅂ / 속이 빨간 여름 과일", ["수박"]],
    ["일반", "초성 ㄸㄱ / 빨간 과일", ["딸기"]],
    ["일반", "초성 ㅍㄷ / 알이 송이로 달리는 과일", ["포도"]],
    ["일반", "초성 ㅂㅅㅇ / 털이 있는 과일", ["복숭아"]],
    ["일반", "초성 ㄱㅇㅇ / 야옹 하고 우는 동물", ["고양이"]],
    ["일반", "초성 ㄱㅇㅈ / 개의 새끼", ["강아지"]],
    ["일반", "초성 ㅋㄲㄹ / 코가 긴 동물", ["코끼리"]],
    ["일반", "초성 ㄱㄹ / 목이 긴 동물", ["기린"]],
    ["일반", "초성 ㅎㄹㅇ / 줄무늬가 있는 큰 고양잇과 동물", ["호랑이"]],
    ["일반", "영어 apple의 뜻은?", ["사과"]],
    ["일반", "영어 banana의 뜻은?", ["바나나"]],
    ["일반", "영어 cat의 뜻은?", ["고양이"]],
    ["일반", "영어 dog의 뜻은?", ["개", "강아지"]],
    ["일반", "영어 water의 뜻은?", ["물"]],
    ["일반", "영어 book의 뜻은?", ["책"]],
    ["일반", "영어 school의 뜻은?", ["학교"]],
    ["일반", "영어 sun의 뜻은?", ["태양", "해"]],
    ["일반", "영어 moon의 뜻은?", ["달"]],
    ["일반", "영어 star의 뜻은?", ["별"]],
    ["일반", "대한민국에서 가장 높은 산은?", ["한라산"]],
    ["일반", "서울을 가로지르는 대표적인 강은?", ["한강"]],
    ["일반", "세계에서 가장 큰 대양은?", ["태평양"]],
    ["일반", "세계에서 가장 높은 산은?", ["에베레스트", "에베레스트산"]],
    ["일반", "지구에서 가장 큰 대륙은?", ["아시아"]],
    ["일반", "피라미드로 유명한 나라는?", ["이집트"]],
    ["일반", "에펠탑이 있는 나라는?", ["프랑스"]],
    ["일반", "만리장성이 있는 나라는?", ["중국"]],
    ["일반", "후지산이 있는 나라는?", ["일본"]],
    ["일반", "21 + 4 = ?", ["25"]],
    ["일반", "22 + 5 = ?", ["27"]],
    ["일반", "23 + 6 = ?", ["29"]],
    ["일반", "24 + 7 = ?", ["31"]],
    ["일반", "25 + 8 = ?", ["33"]],
    ["일반", "26 + 9 = ?", ["35"]],
    ["일반", "27 + 10 = ?", ["37"]],
    ["일반", "28 + 11 = ?", ["39"]],
    ["일반", "29 + 12 = ?", ["41"]],
    ["일반", "30 + 13 = ?", ["43"]],
    ["일반", "31 + 14 = ?", ["45"]],
    ["일반", "32 + 15 = ?", ["47"]],
    ["일반", "33 + 16 = ?", ["49"]],
    ["일반", "34 + 17 = ?", ["51"]],
    ["일반", "35 + 18 = ?", ["53"]],
    ["일반", "36 + 19 = ?", ["55"]],
    ["일반", "37 + 3 = ?", ["40"]],
    ["일반", "38 + 4 = ?", ["42"]],
    ["일반", "39 + 5 = ?", ["44"]],
    ["일반", "40 + 6 = ?", ["46"]],
    ["일반", "41 + 7 = ?", ["48"]],
    ["일반", "42 + 8 = ?", ["50"]],
    ["일반", "43 + 9 = ?", ["52"]],
    ["일반", "44 + 10 = ?", ["54"]],
    ["일반", "45 + 11 = ?", ["56"]],
    ["일반", "46 + 12 = ?", ["58"]],
    ["일반", "47 + 13 = ?", ["60"]],
    ["일반", "48 + 14 = ?", ["62"]],
    ["일반", "49 + 15 = ?", ["64"]],
    ["일반", "50 + 16 = ?", ["66"]],
    ["일반", "51 + 17 = ?", ["68"]],
    ["일반", "52 + 18 = ?", ["70"]],
    ["일반", "53 + 19 = ?", ["72"]],
    ["일반", "54 + 3 = ?", ["57"]],
    ["일반", "55 + 4 = ?", ["59"]],
    ["일반", "56 + 5 = ?", ["61"]],
    ["일반", "57 + 6 = ?", ["63"]],
    ["일반", "58 + 7 = ?", ["65"]],
    ["일반", "59 + 8 = ?", ["67"]],
    ["일반", "60 + 9 = ?", ["69"]],
    ["일반", "61 + 10 = ?", ["71"]],
    ["일반", "62 + 11 = ?", ["73"]],
    ["일반", "63 + 12 = ?", ["75"]],
    ["일반", "64 + 13 = ?", ["77"]],
    ["일반", "65 + 14 = ?", ["79"]],
    ["일반", "66 + 15 = ?", ["81"]],
    ["일반", "67 + 16 = ?", ["83"]],
    ["일반", "68 + 17 = ?", ["85"]],
    ["일반", "69 + 18 = ?", ["87"]],
    ["일반", "70 + 19 = ?", ["89"]],
    ["일반", "62 - 6 = ?", ["56"]],
    ["일반", "64 - 7 = ?", ["57"]],
    ["일반", "66 - 8 = ?", ["58"]],
    ["일반", "68 - 9 = ?", ["59"]],
    ["일반", "70 - 10 = ?", ["60"]],
    ["일반", "72 - 11 = ?", ["61"]],
    ["일반", "74 - 12 = ?", ["62"]],
    ["일반", "76 - 13 = ?", ["63"]],
    ["일반", "78 - 14 = ?", ["64"]],
    ["일반", "80 - 15 = ?", ["65"]],
    ["일반", "82 - 16 = ?", ["66"]],
    ["일반", "84 - 17 = ?", ["67"]],
    ["일반", "86 - 5 = ?", ["81"]],
    ["일반", "88 - 6 = ?", ["82"]],
    ["일반", "90 - 7 = ?", ["83"]],
    ["일반", "92 - 8 = ?", ["84"]],
    ["일반", "94 - 9 = ?", ["85"]],
    ["일반", "96 - 10 = ?", ["86"]],
    ["일반", "98 - 11 = ?", ["87"]],
    ["일반", "100 - 12 = ?", ["88"]],
    ["일반", "102 - 13 = ?", ["89"]],
    ["일반", "104 - 14 = ?", ["90"]],
    ["일반", "106 - 15 = ?", ["91"]],
    ["일반", "108 - 16 = ?", ["92"]],
    ["일반", "110 - 17 = ?", ["93"]],
    ["일반", "3 × 5 = ?", ["15"]],
    ["일반", "4 × 8 = ?", ["32"]],
    ["일반", "5 × 11 = ?", ["55"]],
    ["일반", "6 × 4 = ?", ["24"]],
    ["일반", "7 × 7 = ?", ["49"]],
    ["일반", "8 × 10 = ?", ["80"]],
    ["일반", "9 × 3 = ?", ["27"]],
    ["일반", "10 × 6 = ?", ["60"]],
    ["일반", "11 × 9 = ?", ["99"]],
    ["일반", "12 × 2 = ?", ["24"]],
    ["일반", "2 × 5 = ?", ["10"]],
    ["일반", "3 × 8 = ?", ["24"]],
    ["일반", "4 × 11 = ?", ["44"]],
    ["일반", "5 × 4 = ?", ["20"]],
    ["일반", "6 × 7 = ?", ["42"]],
    ["일반", "7 × 10 = ?", ["70"]],
    ["일반", "8 × 3 = ?", ["24"]],
    ["일반", "9 × 6 = ?", ["54"]],
    ["일반", "10 × 9 = ?", ["90"]],
    ["일반", "11 × 2 = ?", ["22"]],
    ["일반", "12 × 5 = ?", ["60"]],
    ["일반", "2 × 8 = ?", ["16"]],
    ["일반", "3 × 11 = ?", ["33"]],
    ["일반", "4 × 4 = ?", ["16"]],
    ["일반", "5 × 7 = ?", ["35"]],
];

function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function num(v){return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,",");}
function pad(n){return n<10?"0"+n:String(n);}
function dateKey(ms=Date.now()){const d=new Date(ms); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
function dateText(ms){const d=new Date(Number(ms));return d.getFullYear()+"년 "+(d.getMonth()+1)+"월 "+d.getDate()+"일";}
function timeText(ms=Date.now()){const d=new Date(Number(ms));return pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());}
function durationText(ms){let s=Math.max(0,Math.floor(Number(ms)/1000)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60,t="";if(h)t+=h+"시간 ";if(m||h)t+=m+"분 ";return t+r+"초";}
function formatWait(s){s=Math.max(0,Math.ceil(s));const m=Math.floor(s/60),r=s%60;return m?m+"분"+(r?" "+r+"초":""):r+"초";}
function formatSize(cm){return Number(cm).toFixed(1)+"cm";}
function normalize(t){return String(t).replace(/\s+/g,"").toLowerCase();}
function normalizeRod(n){return String(n||"").replace(/\s+/g,"").replace(/(낚시대|낚싯대)$/,"");}
function findRod(n){return RODS.find(r=>r.name===n)||null;}
function fishWeight(f,r){return f.weight*(f.tier==="일반"?1:r.luck);}
function pickFish(r){let total=FISH_TABLE.reduce((a,f)=>a+fishWeight(f,r),0),roll=Math.random()*total;for(const f of FISH_TABLE){roll-=fishWeight(f,r);if(roll<0)return f;}return FISH_TABLE[FISH_TABLE.length-1];}
function rollCatch(s){const lo=Math.round(s.min*10),hi=Math.round(s.max*10),z=(lo+Math.floor(Math.random()*(hi-lo+1)))/10,ratio=hi===lo?.5:(z-s.min)/(s.max-s.min);return{species:s,size:z,basePoints:Math.max(1,Math.round(s.base*(.55+1.45*ratio)))};}
function rollRodBonus(rod){const x=Math.random();let sum=0;for(const b of rod.bonus){sum+=b[1];if(x<sum)return b[0];}return 1;}
function levelInfo(x){x=typeof x==="number"&&isFinite(x)?Math.max(0,Math.min(MAX_XP,x)):0;let l=1,r=x;while(l<MAX_LEVEL){const n=100+25*(l-1);if(r<n)return{level:l,progress:r,required:n};r-=n;l++;}return{level:MAX_LEVEL,progress:0,required:0};}
function addXP(p,a){const before=levelInfo(p.xp),old=p.xp;p.xp=Math.min(MAX_XP,p.xp+a);return{before:before.level,after:levelInfo(p.xp),gained:p.xp-old};}
function xpMessage(x){let t="경험치: +"+x.gained+" / Lv."+x.after.level;if(x.after.level===MAX_LEVEL)t+=" (MAX)";else t+=" ("+num(x.after.progress)+"/"+num(x.after.required)+")";if(x.after.level>x.before)t+="\n🎉 레벨업! Lv."+x.before+" → Lv."+x.after.level;return t;}
function newFishing(){return{attempts:0,caught:0,earned:0,bestName:"",bestPoints:0,largestName:"",largestSize:0,lastAt:null,nextAt:0};}
function ensureRoom(d,name){d=d&&typeof d==="object"?d:{};d.name=name||d.name||"";d.players=d.players||{};d.attendance=d.attendance||{};d.study=d.study||{};d.quizQueue=Array.isArray(d.quizQueue)?d.quizQueue:[];d.activeQuiz=d.activeQuiz||null;d.bankVersion=d.bankVersion||BANK_VERSION;return d;}
function getPlayer(d,userId,name){const k="user:"+userId;if(!d.players[k])d.players[k]={name,points:0,wins:0,xp:0,inventory:[],rods:["나무"],equippedRod:"나무",fishing:newFishing(),study:{running:null,records:[]}};const p=d.players[k];p.name=name;p.points=Number(p.points)||0;p.wins=Number(p.wins)||0;p.xp=Math.max(0,Number(p.xp)||0);p.inventory=Array.isArray(p.inventory)?p.inventory:[];p.rods=Array.isArray(p.rods)?p.rods:["나무"];if(!p.rods.includes("나무"))p.rods.push("나무");if(!findRod(p.equippedRod)||!p.rods.includes(p.equippedRod))p.equippedRod="나무";p.fishing=Object.assign(newFishing(),p.fishing||{});p.study=p.study||{running:null,records:[]};p.study.records=Array.isArray(p.study.records)?p.study.records:[];return p;}
function prepareQueue(d){if(d.bankVersion!==BANK_VERSION){d.quizQueue=[];d.bankVersion=BANK_VERSION;}if(d.quizQueue.length)return;d.quizQueue=QUIZZES.map((_,i)=>i);for(let j=d.quizQueue.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[d.quizQueue[j],d.quizQueue[k]]=[d.quizQueue[k],d.quizQueue[j]];}if(d.quizQueue.length>1&&d.quizQueue[0]===d.lastQuizIndex)[d.quizQueue[0],d.quizQueue[1]]=[d.quizQueue[1],d.quizQueue[0]];}

async function initDb(){await pool.query(`CREATE TABLE IF NOT EXISTS bot_rooms (room_id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);}
async function withRoom(roomId,roomName,fn){const client=await pool.connect();try{await client.query("BEGIN");await client.query("INSERT INTO bot_rooms(room_id,data) VALUES($1,$2::jsonb) ON CONFLICT(room_id) DO NOTHING",[roomId,JSON.stringify(ensureRoom({},roomName))]);const q=await client.query("SELECT data FROM bot_rooms WHERE room_id=$1 FOR UPDATE",[roomId]);const d=ensureRoom(q.rows[0].data,roomName);const out=await fn(d);await client.query("UPDATE bot_rooms SET data=$2::jsonb, updated_at=NOW() WHERE room_id=$1",[roomId,JSON.stringify(d)]);await client.query("COMMIT");return out;}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}}

function gameHelp(){return "[통합 봇 명령어]\n\n🎮 게임\n!퀴즈 / !정답 답변\n!낚시 / !낚시정보\n!인벤 / !물고기 도감\n!포인트 / !내정보 / !레벨\n!게임순위\n!상점 / !낚시대구매 이름 / !낚시장착 이름\n\n📅 출석\n!출석 / !출석확인 닉네임 / !출석순위\n\n📚 공부\n!공부 과목 / !공부완료 페이지수 / !공부기록";}

async function handleCommand(d,b){
 const c=String(b.message||"").trim(),uid=String(b.userId||""),name=String(b.name||"알 수 없음");
 if(!uid)return{reply:"사용자 해시를 가져올 수 없습니다."};
 const p=getPlayer(d,uid,name), now=Date.now();
 if(d.activeQuiz && now>=d.activeQuiz.expiresAt){const ans=d.activeQuiz.answers[0];d.activeQuiz=null;if(/^!정답(?:\s|$)/.test(c))return{reply:"⏰ 퀴즈 제한 시간이 지났습니다!\n정답: "+ans+"\n!퀴즈로 새 문제를 시작하세요."};}
 if(c==="!테스트")return{reply:"서버 연결 성공!\nDB 연결도 정상입니다."};
 if(c==="!명령어"||c==="!게임명령어"||c==="!출석명령어")return{reply:gameHelp()};
 if(c==="!퀴즈"){if(d.activeQuiz){const rem=Math.max(0,Math.ceil((d.activeQuiz.expiresAt-now)/1000));return{reply:"이미 퀴즈가 진행 중입니다!\n\n🧩 일반 퀴즈\n\n"+d.activeQuiz.question+"\n\n남은 시간: "+rem+"초\n답변: !정답 답변"};}prepareQueue(d);const idx=d.quizQueue.shift(),q=QUIZZES[idx];d.lastQuizIndex=idx;d.activeQuiz={question:q[1],answers:q[2].slice(),expiresAt:now+QUIZ_SECONDS*1000};return{reply:"🧩 일반 퀴즈 ["+(QUIZZES.length-d.quizQueue.length)+"/"+QUIZZES.length+"]\n\nQ. "+q[1]+"\n\n⏱ 제한 시간: 20초\n💰 첫 정답자 보상: "+num(QUIZ_REWARD)+"점\n⭐ 경험치: +"+QUIZ_XP+"\n\n답변: !정답 답변"};}
 let m=/^!정답(?:\s+([\s\S]*))?$/.exec(c);if(m){const a=(m[1]||"").trim();if(!a)return{reply:"사용법: !정답 답변"};if(!d.activeQuiz)return{reply:"진행 중인 퀴즈가 없습니다.\n!퀴즈로 시작하세요."};let ok=d.activeQuiz.answers.some(x=>normalize(x)===normalize(a));if(!ok)return{reply:"오답입니다! 다시 도전해보세요."};const ans=d.activeQuiz.answers[0];d.activeQuiz=null;p.points+=QUIZ_REWARD;p.wins++;const xp=addXP(p,QUIZ_XP);return{reply:"🎉 "+p.name+"님 정답!\n정답: "+ans+"\n보상: +"+num(QUIZ_REWARD)+"점\n"+xpMessage(xp)+"\n보유 게임 포인트: "+num(p.points)+"점"};}
 if(c==="!낚시"){const s=p.fishing;if(now<s.nextAt)return{reply:"🎣 아직 낚시 대기 시간입니다.\n"+formatWait((s.nextAt-now)/1000)+" 후에 다시 시도해주세요."};s.lastAt=now;s.nextAt=now+FISHING_COOLDOWN_SECONDS*1000;const rod=findRod(p.equippedRod)||RODS[0],res=rollCatch(pickFish(rod)),sp=res.species,multi=rollRodBonus(rod),points=res.basePoints*multi;s.attempts++;s.caught++;s.earned+=points;p.points+=points;if(points>s.bestPoints){s.bestName=sp.name;s.bestPoints=points;}if(res.size>s.largestSize){s.largestName=sp.name;s.largestSize=res.size;}p.inventory.push({name:sp.name,tier:sp.tier,size:res.size,points,caughtAt:now,rod:rod.name,multiplier:multi});const xp=addXP(p,FISHING_XP),title=sp.tier==="신화"?"🌌 신화급 생물 출현! 🌌\n🐉 [신화] "+sp.name+" 포획!":"✨ ["+sp.tier+"] "+sp.name+" 포획!",bonus=multi>1?"\n🔥 낚시대 보너스: ×"+multi+"\n💵 기본 보상: "+num(res.basePoints)+"점":"";return{reply:"🎣 낚시를 시작합니다...\n\n〰️〰️〰️🌊〰️〰️〰️\n        🪝\n\n물고기가 미끼를 물기를 기다리는 중...",followUp:"🎣 "+p.name+"님의 낚시 결과\n\n━━━━━━━━━━━━━━\n"+title+"\n━━━━━━━━━━━━━━\n\n📏 크기: "+formatSize(res.size)+bonus+"\n💰 최종 획득: +"+num(points)+"점\n🎣 사용 낚시대: "+rod.name+"\n\n⭐ "+xpMessage(xp)+"\n\n💰 보유 포인트: "+num(p.points)+"점\n⏱ 다음 낚시: "+formatWait(Math.max(0,(s.nextAt-now)/1000))+" 후",delayMs:FISHING_WAIT_MS};}
 if(c==="!낚시정보"){const s=p.fishing,rem=Math.max(0,(s.nextAt-now)/1000);return{reply:"🎣 "+p.name+"님의 낚시 기록\n시도: "+s.attempts+"회\n잡은 물고기: "+s.caught+"마리\n낚시 수익: "+num(s.earned)+"점\n최고 보상: "+(s.bestName?s.bestName+" / +"+num(s.bestPoints)+"점":"아직 없음")+"\n최대 크기: "+(s.largestName?s.largestName+" / "+formatSize(s.largestSize):"아직 없음")+"\n다음 낚시: "+(rem?formatWait(rem)+" 후":"지금 가능")};}
 if(/^!(포인트|퀴즈점수|내정보|레벨)$/.test(c)){const l=levelInfo(p.xp);return{reply:"👤 "+p.name+"님의 게임 정보\n레벨: "+l.level+" / "+MAX_LEVEL+"\n경험치: "+(l.level===MAX_LEVEL?"MAX":num(l.progress)+" / "+num(l.required))+"\n보유 포인트: "+num(p.points)+"점\n퀴즈 정답: "+p.wins+"회\n잡은 물고기: "+p.fishing.caught+"마리\n인벤토리: "+p.inventory.length+"마리\n장착 낚시대: "+p.equippedRod};}
 if(c==="!게임순위"||c==="!퀴즈순위"){const list=Object.values(d.players).sort((a,b)=>b.points-a.points);if(!list.length)return{reply:"아직 게임 기록이 없습니다."};let t="🏆 이 방의 게임 순위",rank=1;list.slice(0,10).forEach((x,i)=>{if(i&&x.points!==list[i-1].points)rank=i+1;t+="\n"+rank+"등 "+x.name+" · "+num(x.points)+"점 (퀴즈 "+x.wins+"회 · 낚시 "+x.fishing.caught+"마리)";});return{reply:t};}
 if(c==="!인벤"){if(!p.inventory.length)return{reply:"🎒 인벤토리가 비어 있습니다.\n!낚시로 물고기를 잡아보세요."};let t="🎒 "+p.name+"님의 인벤토리\n총 "+p.inventory.length+"마리 · 최신순";for(let i=p.inventory.length-1;i>=0;i--){const f=p.inventory[i];t+="\n"+(i+1)+". ["+f.tier+"] "+f.name+" · "+formatSize(f.size)+" · "+num(f.points)+"점";}return{reply:t+"\n\n포인트는 포획할 때 이미 지급되었습니다."};}
 if(c==="!상점"){let t="🛒 낚시대 상점\n보유 포인트: "+num(p.points)+"점\n현재 장착: "+p.equippedRod;for(const r of RODS){const owned=p.rods.includes(r.name);t+="\n\n"+r.name+" 낚시대 · "+(r.price?num(r.price)+"점":"기본 지급")+(p.equippedRod===r.name?" [장착 중]":owned?" [보유]":"");}return{reply:t+"\n\n구매: !낚시대구매 돌\n교체: !낚시장착 나무"};}
 m=/^!낚시대구매(?:\s+([\s\S]*))?$/.exec(c);if(m){const rod=findRod(normalizeRod(m[1]||""));if(!rod)return{reply:"사용법: !낚시대구매 이름"};if(p.rods.includes(rod.name))return{reply:"이미 보유한 낚시대입니다."};if(p.points<rod.price)return{reply:"포인트가 부족합니다.\n부족: "+num(rod.price-p.points)+"점"};p.points-=rod.price;p.rods.push(rod.name);p.equippedRod=rod.name;return{reply:"🎣 "+rod.name+" 낚시대 구매·장착 완료!\n남은 포인트: "+num(p.points)+"점"};}
 m=/^!낚시장착(?:\s+([\s\S]*))?$/.exec(c);if(m){const rod=findRod(normalizeRod(m[1]||""));if(!rod)return{reply:"사용법: !낚시장착 이름"};if(!p.rods.includes(rod.name))return{reply:"보유하지 않은 낚시대입니다."};p.equippedRod=rod.name;return{reply:"🎣 "+rod.name+" 낚시대 장착 완료!"};}
 if(/^!물고기\s*도감$/.test(c)||c==="!물고기목록"){const rod=findRod(p.equippedRod)||RODS[0],total=FISH_TABLE.reduce((a,f)=>a+fishWeight(f,rod),0),owned={};p.inventory.forEach(f=>owned[f.name]=true);let t="📖 물고기 도감 · 전체 20종\n현재 낚시대: "+rod.name;for(const f of FISH_TABLE){const chance=(fishWeight(f,rod)/total*100).toFixed(2)+"%";t+="\n\n"+(owned[f.name]?"✅ ":"▫️ ")+"["+f.tier+"] "+f.name+" · "+chance+"\n"+formatSize(f.min)+"~"+formatSize(f.max)+" / 기본 "+num(Math.round(f.base*.55))+"~"+num(Math.round(f.base*2))+"점";}return{reply:t};}
 if(c==="!출석"){const dk=dateKey();d.attendance[dk]=Array.isArray(d.attendance[dk])?d.attendance[dk]:[];const list=d.attendance[dk],found=list.findIndex(x=>x.userId===uid);if(found>=0){list[found].name=name;return{reply:name+"님은 이미 오늘 출석했습니다.\n출석 순위: "+(found+1)+"등\n출석 시간: "+list[found].time};}const tm=timeText();list.push({userId:uid,name,time:tm});return{reply:name+"님 출석 완료!\n오늘 "+list.length+"번째로 출석했습니다.\n출석 시간: "+tm};}
 m=/^!출석확인(?:\s+([\s\S]*))?$/.exec(c);if(m){let target=(m[1]||"").trim();if(target.startsWith("@"))target=target.substring(1).trim();if(!target)return{reply:"사용법: !출석확인 닉네임\n예: !출석확인 @홍길동"};const list=d.attendance[dateKey()]||[],found=[];list.forEach((x,i)=>{if(x.name===target)found.push({rank:i+1,time:x.time});});if(!found.length)return{reply:target+"님은 오늘 출석하지 않았습니다."};if(found.length===1)return{reply:target+"님은 오늘 출석했습니다.\n출석 순위: "+found[0].rank+"등\n출석 시간: "+found[0].time};let t=target+" 닉네임으로 출석한 사용자가 "+found.length+"명 있습니다.";found.forEach((x,i)=>t+="\n"+(i+1)+". "+x.rank+"등 / "+x.time);return{reply:t};}
 if(c==="!출석순위"){const list=d.attendance[dateKey()]||[];if(!list.length)return{reply:"오늘은 아직 출석한 사람이 없습니다."};const medals=["🥇","🥈","🥉"];let t="오늘의 출석 순위";list.slice(0,3).forEach((x,i)=>t+="\n"+medals[i]+" "+(i+1)+"등 "+x.name+" ("+x.time+")");return{reply:t+"\n\n오늘 총 출석: "+list.length+"명"};}
 if(c==="!공부"||c.startsWith("!공부 ")){const subject=c.substring(3).trim();if(!subject)return{reply:"📚 공부할 과목을 입력해주세요.\n\n예) !공부 자바스크립트"};if(p.study.running){const r=p.study.running;return{reply:"⚠️ 이미 공부 중입니다.\n\n📖 과목 » "+r.subject+"\n📅 시작일 » "+dateText(r.startTime)+"\n🕐 시작 » "+timeText(r.startTime)+"\n⏱ 현재 공부시간 » "+durationText(now-r.startTime)+"\n\n공부를 끝내려면\n!공부완료 페이지수"};}p.study.running={subject,startTime:now};return{reply:"📚 오늘 공부 시작!\n\n👤 "+name+"\n📅 "+dateText(now)+"\n📖 과목 » "+subject+"\n🕐 시작 » "+timeText(now)+"\n\n⏱ 스톱워치를 시작했습니다!"};}
 m=/^!공부완료(?:\s+([\s\S]*))?$/.exec(c);if(m){if(!p.study.running)return{reply:"❌ 현재 진행 중인 공부가 없습니다.\n\n먼저 !공부 과목 을 입력해주세요."};const s=(m[1]||"").trim();if(!/^\d+$/.test(s)||Number(s)<1)return{reply:"📄 공부한 페이지 수를 숫자로 입력해주세요.\n예) !공부완료 15"};const pages=Number(s),r=p.study.running,record={subject:r.subject,startTime:r.startTime,endTime:now,duration:now-r.startTime,pageCount:pages};p.study.records.push(record);p.study.running=null;return{reply:"✅ 공부 완료!\n\n👤 "+name+"\n📅 "+dateText(record.startTime)+"\n📖 과목 » "+record.subject+"\n\n🕐 시작 » "+timeText(record.startTime)+"\n🏁 종료 » "+timeText(now)+"\n⏱ 공부시간 » "+durationText(record.duration)+"\n\n📄 공부량 » "+pages+"페이지"};}
 if(c==="!공부기록"){const rs=p.study.records;if(!rs.length)return{reply:"📚 아직 저장된 공부 기록이 없습니다."};const days={},total=rs.reduce((a,r)=>{days[dateKey(r.startTime)]=true;a.ms+=Number(r.duration);a.pages+=Number(r.pageCount);return a;},{ms:0,pages:0});let t="📚 "+name+"님의 공부 기록\n\n📅 총 공부일 » "+Object.keys(days).length+"일\n📖 총 공부 횟수 » "+rs.length+"회\n⏱ 총 공부시간 » "+durationText(total.ms)+"\n📄 총 공부량 » "+total.pages+"페이지\n\n";rs.slice().reverse().forEach(r=>{t+="──────────────\n📅 "+dateText(r.startTime)+"\n📖 과목 » "+r.subject+"\n🕐 시작 » "+timeText(r.startTime)+"\n🏁 종료 » "+timeText(r.endTime)+"\n⏱ 공부시간 » "+durationText(r.duration)+"\n📄 공부량 » "+r.pageCount+"페이지\n\n";});return{reply:t.trim()};}
 return{reply:null};
}

app.get("/",(req,res)=>res.send("HZ Game Server Online"));
app.get("/health",async(req,res)=>{try{await pool.query("SELECT 1");res.json({ok:true,database:true});}catch(e){res.status(500).json({ok:false,error:String(e.message||e)});}});
app.post("/bot",async(req,res)=>{try{const b=req.body||{};const roomId=String(b.roomId||b.room||"");if(!roomId)return res.status(400).json({reply:"roomId가 없습니다."});const out=await withRoom(roomId,String(b.roomName||b.room||""),d=>handleCommand(d,b));res.json(out);}catch(e){console.error(e);res.status(500).json({reply:"서버 데이터 처리에 실패했습니다.\n오류: "+String(e.message||e)});}});

const PORT=process.env.PORT||3000;
initDb().then(()=>app.listen(PORT,()=>console.log("Server started on port "+PORT))).catch(e=>{console.error("DB init failed",e);process.exit(1);});
