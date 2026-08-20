/* ============================================================
   docs.js: every readable in the game.
   Typography roles per doc §8 are applied via the .doc-* skins
   in styles/game.css.
   ============================================================ */

// ---------------------------------------------------------------- THE NINE
export const NINE = [
  { name: 'Andrej Vasko',      age: 44, note: 'timberman' },
  { name: 'Michal Prosser',    age: 51, note: 'fire boss' },
  { name: 'Štefan Kowal',      age: 29, note: 'loader' },
  { name: 'Jan Hurka',         age: 38, note: 'motorman' },
  { name: 'Wasyl Demko',       age: 47, note: 'timberman' },
  { name: 'Petro Baran',       age: 22, note: 'nipper' },
  { name: 'Ignác Sedlák',      age: 55, note: 'fire boss' },
  { name: 'Tomasz Rudnik',     age: 33, note: 'loader' },
  { name: 'Ondrej Lisak',      age: 19, note: 'nipper' }
];

// ---------------------------------------------------------------- MICROFILM
export const SENTINEL_1963 = `
<h1>NINE SEALED IN NO. 9 AS FIRE REACHES MAIN SEAM</h1>
<h2>THE ASHGROVE SENTINEL &nbsp;·&nbsp; Wednesday, February 13, 1963 &nbsp;·&nbsp; Five Cents</h2>
<p><b>ASHGROVE</b>. Nine men are believed dead in the Kesslerton No. 9 colliery
following a decision Tuesday evening to seal the main gangway against a fire that
company engineers said had reached the anthracite seam itself.</p>
<p>The order to close the gangway was given at 9:40 p.m. by Mr. Aldous Hale,
president of Hale Anthracite, who told this newspaper that "the seam is the town.
If the seam burns, there is nothing here in five years. There was not a choice to make."</p>
<p>Asked whether the men had been accounted for before the order was carried out,
Mr. Hale said the question was one for the state inspector.</p>
<div class="rule"></div>
<p>The state inspector, Mr. L. Brennan, could not be reached Tuesday night.
A crew of company men worked until after two in the morning bricking the gangway
at the 400-foot level. Two of them, contacted by this newspaper, declined to give
their names. One said he had heard the men. The other said he had not.</p>
<p>The nine are: Andrej Vasko, 44; Michal Prosser, 51; Štefan Kowal, 29;
Jan Hurka, 38; Wasyl Demko, 47; Petro Baran, 22; Ignác Sedlák, 55;
Tomasz Rudnik, 33; and Ondrej Lisak, 19.</p>
<p>All nine were residents of Kesslerton Row. Seven were communicants of
St. Brigid's of the Assumption. The Rev. F. Zabek has said a Mass will be offered
Thursday morning and that the parish will not be holding funerals, as there is
nothing to bury.</p>
<div class="rule"></div>
<p>Mr. Hale said the company would "see to" the families. Asked what form that
would take, he said the matter was in hand and that he would not be discussing it
further. He left the newspaper's office at a quarter past eleven.</p>
<p>The fire is expected to burn in the sealed section for some time. Company
engineers estimated "several months." The seam above the sealed gangway remains
in production.</p>
<p style="margin-top:14px;font-style:italic">A subscription for the families has been
opened at the Ashgrove Savings &amp; Trust. Mr. Hale is listed as its first subscriber,
in the amount of nine dollars.</p>`;

export const SENTINEL_1963_B = `
<h1>"SEAM SAVED," SAYS HALE, AS TOWN MARKS ONE YEAR</h1>
<h2>THE ASHGROVE SENTINEL &nbsp;·&nbsp; Friday, February 14, 1964</h2>
<p><b>ASHGROVE</b>. A concrete cap was poured Thursday over the head of Shaft 9,
with the names of the nine men cast into its face at the request of the parish.</p>
<p>Mr. Aldous Hale, who did not attend, said through the company office that the
cap was "a permanent memorial and a permanent closure," and that Hale Anthracite
considered the matter concluded.</p>
<p>The Rev. F. Zabek, who blessed the cap, was asked afterward whether the parish
was satisfied. He said: "The company has paid what a company can pay."</p>
<div class="rule"></div>
<p>Snow that had fallen through the week was noted to be absent from the ground
above the sealed section. A company engineer attributed this to residual heat and
said it was expected to abate within the year.</p>`;

// ---------------------------------------------------------------- FLYERS
export const FLYERS = [
  { name: 'Halina Baran',   age: 20, date: 'August 14, 1965',    last: 'Ridge Road, near the Wash-Rite' },
  { name: 'Terry Lisak',    age: 19, date: 'September 2, 1974',  last: 'Colliery Road' },
  { name: 'Diane Hurka',    age: 21, date: 'September 19, 1983', last: 'the Anthracite Diner, closing' },
  { name: 'Paul Demko',     age: 20, date: 'September 21, 1992', last: 'St. Brigid\'s cemetery gate' },
  { name: 'Krys Sedlák',    age: 19, date: 'September 22, 2001', last: 'the Fuel & Go forecourt' },
  { name: 'Amy Rudnik',     age: 20, date: 'September 20, 1969', last: 'Kesslerton Row' },
  { name: 'Joseph Prosser', age: 21, date: 'September 23, 1978', last: 'Colliery Road, walking' },
  { name: 'Nadia Vasko',    age: 19, date: 'September 22, 1987', last: 'her own back porch' },
  { name: 'Elena Kowal',    age: 21, date: 'September 22, 2011', last: 'St. Brigid\'s of the Assumption' }
];

export const flyerHTML = (f) => `
<h1>MISSING</h1>
<div style="font-family:var(--news-b);font-size:15px;letter-spacing:.02em">ASHGROVE BOROUGH POLICE ASK FOR ANY INFORMATION</div>
<div class="photo"></div>
<div style="font-family:var(--news-h);font-size:26px;font-weight:700;margin:6px 0 2px">${f.name}</div>
<div style="font-size:14px;margin-bottom:14px">Age ${f.age}</div>
<div style="font-family:var(--ui);font-size:13.5px;line-height:1.8;border-top:1px solid #999;border-bottom:1px solid #999;padding:10px 0;margin:0 auto;max-width:34ch">
  <b>LAST SEEN</b><br>${f.date}<br>${f.last}
</div>
<div style="font-size:11px;margin-top:16px;opacity:.7;font-family:var(--mono)">ANY INFORMATION · ASHGROVE PD · 570-555-0119</div>`;

// ---------------------------------------------------------------- THE ROW
/* The two dead shops opposite 118 1/2. Everything either of them says
   is a matter of public record, and that is the point: none of this was
   hidden, it was filed. */

export const CLEANERS_TICKET = `
<div style="font-family:var(--mono);font-size:13px;letter-spacing:.08em;color:#6a6152;margin-bottom:16px">
  [ a laundry ticket, pinned to the bag by its own wire, gone the colour of weak tea ]</div>
<div style="border:1px solid #b3ab94;padding:20px 22px;max-width:36ch;margin:0 auto;background:#efe9d8">
  <div style="font-family:var(--news-h);font-size:20px;letter-spacing:.04em;text-align:center">KOWAL CLEANERS</div>
  <div style="font-family:var(--mono);font-size:12px;text-align:center;opacity:.7;margin-bottom:16px">
    121 RIDGE RD · ASHGROVE PA · 570-555-0164</div>
  <div style="font-family:var(--mono);font-size:14px;display:flex;justify-content:space-between"><span>NO. 4471</span><span>RACK 9</span></div>
  <div style="font-family:var(--mono);font-size:14px;display:flex;justify-content:space-between"><span>IN 09/21/11</span><span>OUT 09/23/11</span></div>
  <div style="border-top:1px solid #b3ab94;margin:14px 0 12px"></div>
  <div style="font-family:var(--hand-victor);font-size:23px;line-height:1.6;color:#2a2520">
    KOWAL, E.<br>
    1 coat, canvas, mens 44<br>
    <span style="font-size:19px">grandpas. do NOT press the collar.</span><br>
    <span style="font-size:19px">paid $6.00</span>
  </div>
  <div style="border-top:1px solid #b3ab94;margin:12px 0 10px"></div>
  <div style="font-family:var(--mono);font-size:12px;letter-spacing:.06em;opacity:.75">
    PAID IN ADVANCE · CALL FRIDAY IF NOT COLLECTED</div>
</div>
<div style="margin-top:22px;font-size:13.5px;font-family:var(--ui);line-height:1.9;max-width:44ch;margin-left:auto;margin-right:auto">
  On the back, in a second hand, in biro, pressed hard:
</div>
<div style="font-family:var(--hand-victor);font-size:24px;line-height:1.5;color:#3a2a1e;margin-top:10px">
  HOLD.<br>
  DO NOT DESTROY.<br>
  <span style="font-size:18px">V.K. · 2/2012 · 6/2012 · 9/2012 · 9/2013 · 9/2014</span>
</div>`;

export const REALTY_LEDGER = `
<div style="font-variant:small-caps;font-size:22px;letter-spacing:.06em;margin-bottom:6px">Record of Conveyance</div>
<div style="font-size:14px;letter-spacing:.1em;opacity:.7;margin-bottom:26px">
  BOROUGH OF ASHGROVE · BOOK 214, PAGE 88 · FEBRUARY 1964</div>
<div style="font-size:14px;line-height:1.9;margin-bottom:18px">
  GRANTOR in every instance: <b>HALE ANTHRACITE COMPANY</b>, by A. Hale, pres.<br>
  Premises: company houses, Kesslerton Row, Nos. 1 through 9, with lot.</div>
<div class="col" style="font-size:14px;letter-spacing:.08em;opacity:.6;border-bottom:1px solid #b3ab94;padding-bottom:4px">
  <span>GRANTEE</span><span>PREMISES</span><span>CONSIDERATION</span></div>
<div class="col"><span>Vasko, Maria, widow</span><span>No. 9</span><span>$1.00</span></div>
<div class="col"><span>Prosser, Ann, widow</span><span>No. 8</span><span>$1.00</span></div>
<div class="col"><span>Kowal, Zofia, widow</span><span>No. 7</span><span>$1.00</span></div>
<div class="col"><span>Hurka, Wanda, widow</span><span>No. 6</span><span>$1.00</span></div>
<div class="col"><span>Demko, Olena, widow</span><span>No. 5</span><span>$1.00</span></div>
<div class="col"><span>Baran, Josef, father</span><span>No. 4</span><span>$1.00</span></div>
<div class="col"><span>Sedlák, Anna, widow</span><span>No. 3</span><span>$1.00</span></div>
<div class="col"><span>Rudnik, Helena, widow</span><span>No. 2</span><span>$1.00</span></div>
<div class="col"><span>Lisak, Marie, mother</span><span>No. 1</span><span>$1.00</span></div>
<div class="col" style="border-top:1px solid #b3ab94;padding-top:6px;margin-top:6px">
  <span style="opacity:.6">RECORDED 2/14/1964</span><span></span><span><b>$9.00</b></span></div>
<div style="margin-top:26px;font-size:13.5px;line-height:1.9;opacity:.8">
  Each instrument carries the same rider, typed, in the same words:
  <i>"in full and final settlement of any claim arising out of the events of
  February 12, 1963, the grantee acknowledging that no admission is made or
  intended."</i></div>
<div class="hand" style="margin-top:22px;font-size:20px;line-height:1.5;color:#3a2a1e">
  in pencil, in the margin, in a clerk's hand:<br>
  <span style="font-size:24px">nine houses. nine dollars. he did the arithmetic first.</span></div>`;

export const REALTY_CARD_118 = `
<div style="font-family:var(--mono);font-size:13px;letter-spacing:.08em;color:#6a6152;margin-bottom:16px">
  [ a listing card, curled, sun-bleached down one side, still in the window ]</div>
<div style="border:1px solid #b3ab94;padding:18px 20px;max-width:32ch;margin:0 auto;background:#efe9d8;text-align:center">
  <div style="font-family:var(--news-h);font-size:19px;letter-spacing:.03em">118½ RIDGE RD</div>
  <div style="background:#c9c2ad;height:96px;margin:14px 0;display:flex;align-items:center;justify-content:center;
              font-family:var(--mono);font-size:12px;color:#6a6152;letter-spacing:.1em">[ PHOTO REMOVED ]</div>
  <div style="font-family:var(--mono);font-size:13px;line-height:2">
    1 BR OVER SHOP<br>$340/MO · HEAT INCL.<br>
    ENTRANCE BY EXTERIOR STAIR<br>
    INQ. OSTROWSKI, DOWNSTAIRS</div>
  <div style="font-family:var(--mono);font-size:11px;margin-top:14px;color:#8a2f22;letter-spacing:.08em">
    STANKO REALTY · ASHGROVE</div>
</div>
<div style="margin-top:20px;font-size:13.5px;font-family:var(--ui);line-height:1.9;max-width:42ch;margin-left:auto;margin-right:auto">
  The card next to it is for the unit this office is standing in.
  The one after that is for a four-bedroom company house on Kesslerton Row,
  conveyed in 1964 for one dollar, and marked, in the same typing,
  <b>NOT FOR SALE</b>.</div>`;

// ---------------------------------------------------------------- REGISTER
export const REGISTER_BAPTISM = `
<div style="font-variant:small-caps;font-size:22px;letter-spacing:.06em;margin-bottom:6px">Liber Baptizatorum</div>
<div style="font-size:14px;letter-spacing:.1em;opacity:.7;margin-bottom:26px">
  ECCLESIA S. BRIGIDAE ASSUMPTIONIS · ASHGROVE, PA. · A.D. MCMIV-</div>
<div class="col" style="font-size:14px;letter-spacing:.08em;opacity:.6;border-bottom:1px solid #b3ab94;padding-bottom:4px">
  <span>NOMEN</span><span>NATUS</span><span>BAPTIZATUS</span></div>
<div class="col"><span>Vasko, Recca Marta</span><span>19 Mar 1994</span><span>4 Mai 1994</span></div>
<div class="col" style="opacity:.55"><span>Vasko, Nadia Anna</span><span>2 Feb 1968</span><span>17 Mar 1968</span></div>
<div class="col" style="opacity:.55"><span>Kowal, Elena Terézia</span><span>8 Jun 1990</span><span>21 Jul 1990</span></div>
<div class="col" style="opacity:.55"><span>Kowal, Wiktor Štefan</span><span>11 Nov 1990</span><span>6 Jan 1991</span></div>
<div style="margin-top:34px;font-size:13px;opacity:.5;letter-spacing:.06em">
  Parentes: Vasko, Marta (née Hurka) · Vasko, Andrej Jr. (†1999)<br>
  Patrini: Prosser, Dale J. · Sedlák, Anna</div>`;

export const REGISTER_DEATH = `
<div style="font-variant:small-caps;font-size:22px;letter-spacing:.06em;margin-bottom:6px">Liber Defunctorum</div>
<div style="font-size:14px;letter-spacing:.1em;opacity:.7;margin-bottom:26px">
  ECCLESIA S. BRIGIDAE ASSUMPTIONIS · ASHGROVE, PA.</div>
<div class="col" style="font-size:14px;letter-spacing:.08em;opacity:.6;border-bottom:1px solid #b3ab94;padding-bottom:4px">
  <span>NOMEN</span><span>OBIIT</span><span>SEPULTUS</span></div>
<div class="col" style="opacity:.5"><span>Ostrowski, Feliks</span><span>3 Iun 2014</span><span>7 Iun 2014</span></div>
<div class="col" style="opacity:.5"><span>Hurka, Wanda</span><span>28 Iul 2014</span><span>31 Iul 2014</span></div>
<div class="col hand" style="color:#3a2a1e">
  <span>Vasko, Recca Marta</span><span>22 Sep 2014</span><span></span></div>
<div class="hand" style="margin-top:8px;font-size:20px;line-height:1.5;color:#3a2a1e">
  no funeral. no interment. no wake.<br>
  causa: <span style="text-decoration:underline">entered</span><br>
  <span style="font-size:16px;opacity:.8">entered by hand, second ink, undated</span></div>
<div style="margin-top:40px;font-size:13px;opacity:.45">Ninety-one days ago.</div>`;

// ---------------------------------------------------------------- HOHMAN
export const HOHMAN = `
<div style="text-align:center;border-bottom:2px solid #6a5c3c;padding-bottom:18px;margin-bottom:22px">
  <div style="font-variant:small-caps;font-size:30px;letter-spacing:.05em">The Long Lost Friend</div>
  <div style="font-size:15px;margin-top:8px;font-style:italic">or, A Collection of Mysterious and Invaluable
  Arts and Remedies, for Man as well as Animals</div>
  <div style="font-size:14px;margin-top:14px">BY JOHN GEORGE HOHMAN &nbsp;·&nbsp; HARRISBURG, 1820</div>
</div>
<p style="font-style:italic;opacity:.8">Whoever carries this book with him, is safe from all his enemies,
visible or invisible; and whoever has this book with him cannot die without the holy corpse of Jesus
Christ, nor drown in any water, nor burn up in any fire, nor can any unjust sentence be passed upon him.</p>
<h3>To Prevent a Person from Doing You Harm</h3>
<p>Speak the name of the person, and no other name, and say: <i>I conjure thee by the four Evangelists,
that thou standest still and comest not nearer.</i> Repeat it three times, and no more than three,
for the fourth undoes the third.</p>
<h3>A Charm Against Fire</h3>
<p>Our dear Sarah journeyed through the land, having a fiery brand in her hand. The fiery brand heats;
the fiery brand sweeps. Fiery brand, go out! ✝ ✝ ✝</p>
<h3>To Stop Blood</h3>
<p>Jesus Christ, dearest blood! That stoppeth the pain and stoppeth the blood.
In this help you God the Father, God the Son, God the Holy Ghost. Amen.</p>
<h3 style="color:#5a2018">A Thing Called by Its Name</h3>
<p>A thing that hath a name is bound by that name and by no other. If the name be written and the
writing be burned, the thing written of is loosed and must go from the place. <b>Take care: what is
loosed goeth somewhere.</b></p>
<h3 style="color:#5a2018">Of Answering</h3>
<p>If thou art called by thy name out of a dark place, and thou knowest not with certainty who calleth,
<b>answer not</b>. To answer is to consent, and consent is the whole of the matter. This is why the
old people would not call a child in from the field after dark, but went and fetched it.</p>
<div style="margin-top:30px;padding-top:16px;border-top:1px solid #a89a72;font-size:14px;opacity:.65">
  Water damage across pages 41–47. Someone has underlined <i>consent is the whole of the matter</i>
  twice, in pencil, hard enough to tear the paper.<br>
  Pawn ticket taped inside the back cover: <span style="font-family:var(--mono)">KESSLERTON PAWN &amp; LOAN · $4.00 · 09/2011 · KOWAL, E.</span>
</div>`;

// ---------------------------------------------------------------- INDEX CARDS
export const VICTOR_CARDS = `
<div style="font-size:16px;font-family:var(--mono);opacity:.5;margin-bottom:18px">
  [ index cards, rubber-banded, lamp-oil thumbprints on most of them ]</div>
<p>bell. NINE. slow. four seconds minimum between.<br>
if you rush it the count doesn't take and we do it again<br>
and we don't get to do it again</p>
<hr style="border:0;border-top:1px solid #c9c2ad;margin:20px 0">
<p>HOHMAN p.63, "if thou art called by thy name out of a dark place<br>
and thou knowest not with certainty who calleth, ANSWER NOT"<br>
<span style="font-size:26px">DO NOT ANSWER IT ELENA</span></p>
<hr style="border:0;border-top:1px solid #c9c2ad;margin:20px 0">
<p>seals: salt + iron. four doors.<br>
west main / sacristy ext / sanctuary side / <span style="text-decoration:underline">COAL CHUTE</span><br>
the chute is the one everybody forgets. it's outside. you have to go around.</p>
<hr style="border:0;border-top:1px solid #c9c2ad;margin:20px 0">
<p>it cannot come in unless invited<br>
it cannot take him unless he goes<br>
that's it. that's the whole thing. everything else is housekeeping</p>
<hr style="border:0;border-top:1px solid #c9c2ad;margin:20px 0">
<p style="color:#5a2018">nine years. 65 74 83 92 01 <span style="text-decoration:line-through">10</span> 11<br>
they were LATE in 2011<br>
they were late because she wouldn't go<br>
neither will the next one if somebody TELLS THEM</p>`;

// ---------------------------------------------------------------- MISC
export const WHITEBOARD = [
  'milk<br>the good kind not the blue one',
  'you left the burner on again<br>r',
  'gone to work<br>there is soup<br>EAT THE SOUP',
  '<span style="font-size:44px">♥</span>',
  'your dad called<br>i said you were out<br>you owe me',
  'i drew you a bird<br><span style="font-size:52px">ᕕ( ᐛ )ᕗ</span>',
  '3 days<br>3 days<br>3 days',
  ''
];

export const OSTROWSKI_NOTE = `
<div style="font-family:var(--hand-victor);font-size:24px;line-height:1.7;color:#2a2520">
Jared -<br><br>
This was my Feliks's. He wore it forty-one years and never once<br>
took it off, not even in the hospital, and they had to argue with him.<br><br>
It is St. Benedict. You put it in your pocket and you forget about it.<br>
That is all it asks.<br><br>
Welcome to the building. The radiator knocks. It stops if you talk to it.<br><br>. H. Ostrowski, 118 Ridge (downstairs)
</div>`;

export const GRAFFITI_NOTE = `
<div style="font-family:var(--mono);font-size:15px;line-height:1.9;color:#cfd3d6;background:#141416;padding:26px">
Half a mile of cracked blacktop. Decades of spray paint, layer on layer.<br><br>
CLASS OF 94 · SHANE + BEV · JESUS SAVES · 61 4EVER · a nine-foot cartoon eye ·<br>
FLYERS SUCK · someone's whole name and phone number · KEEP OUT (twice) ·<br>
a very good dinosaur ·<br><br>
and then, small, in white, near the shoulder, in handwriting Jared has been<br>
looking at on cassette labels for three months:<br><br>
<span style="font-size:22px;color:#e8e8e8">E.K. was here 9/2011</span><br><br>
Underneath it, in the same hand, smaller:<br>
<span style="font-size:18px;color:#b8bcc0">if you are reading this i was right</span>
</div>`;
