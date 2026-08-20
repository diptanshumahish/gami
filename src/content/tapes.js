/* ============================================================
   tapes.js: Elena Kowal's twelve microcassettes.

   She recorded herself for a year before she vanished. She
   figured out everything Jared is figuring out. She was two
   days from telling her brother.
   Collecting all twelve unlocks Ending C.
   ============================================================ */

const T = (tc, text) => `<div><span class="tc">${tc}</span>  ${text}</div>`;
const hdr = (label, where) => `
  <div style="font-family:var(--mono);font-size:12px;color:#6d757c;border-bottom:1px solid #33383c;padding-bottom:10px;margin-bottom:18px;letter-spacing:.06em">
    MICROCASSETTE · 60 MIN · SIDE A<br>
    LABEL, IN BALLPOINT: <span style="color:#cfd3d6">${label}</span><br>
    FOUND: ${where}
  </div>`;

export const TAPES = [
  {
    id: 't01', label: 'OCT, ma\'s hands', where: 'pawn shop, glass case, $2',
    html: hdr('OCT, ma\'s hands', 'Kesslerton Pawn &amp; Loan, glass case, two dollars') + `
${T('00:00', 'Okay. Uh. This is stupid.')}
${T('00:04', 'This is Elena Kowal, it\'s. October something, 2010, and I am talking into a tape recorder in my car because I am twenty years old and I have nobody to tell.')}
${T('00:19', 'My mother stopped sleeping in September. Every September. I thought that was grief. Dad died in September, so, fine, that\'s grief, that tracks.')}
${T('00:34', 'Except she was doing it before he died.')}
${T('00:41', 'I checked. I found her prescriptions. She\'s been not sleeping every September since 1983.')}
${T('00:52', '[long pause]')}
${T('01:03', 'Anyway. Hi, tape. I guess you\'re a diary now.')}`
  },
  {
    id: 't02', label: 'NOV, the diner wall', where: 'library return bin',
    html: hdr('NOV, the diner wall', 'Ashgrove State library, in the return bin, no barcode') + `
${T('00:00', 'There are nine flyers on the wall at the Anthracite.')}
${T('00:06', 'Dale keeps saying he means to take them down. He\'s been saying that as long as I\'ve been alive. He says it like a joke about how lazy he is.')}
${T('00:18', 'I counted the dates today while I waited for my eggs.')}
${T('00:23', '1965. 1974. 1983. 1992. 2001.')}
${T('00:31', 'That\'s every nine years.')}
${T('00:36', 'The other four don\'t fit the pattern, they\'re 69, 78, 87, and, one\'s 2010, and that one\'s blank, there\'s no photo on it, it\'s just a rectangle of nothing with a phone number.')}
${T('00:53', 'So it\'s not every nine years. It\'s every nine years, and then again, and then again, like they keep trying and it doesn\'t take.')}
${T('01:06', 'I asked Dale who Halina Baran was. He gave me my eggs for free.')}`
  },
  {
    id: 't03', label: 'JAN, hohman', where: 'Vasko basement, on the fuse box',
    html: hdr('JAN, hohman', 'the Vasko basement, sitting on top of the fuse box') + `
${T('00:00', 'I bought a book for four dollars.')}
${T('00:04', 'It\'s called The Long Lost Friend. It\'s a real book, it\'s from 1820, my grandmother had one and I thought it was recipes.')}
${T('00:14', 'It\'s not recipes.')}
${T('00:18', 'It\'s Braucherei. Powwow. It\'s Christian folk magic, it\'s, it\'s not devil stuff, it\'s the opposite, it\'s farmers asking the Trinity to stop a nosebleed.')}
${T('00:32', 'There\'s a charm in it for stopping fire. There\'s one for stopping blood. There\'s one to prevent a person from doing you harm.')}
${T('00:42', 'And there\'s two pages that I have read about forty times.')}
${T('00:48', 'One says a thing is bound by its name, and if you write the name and burn the writing, the thing is loosed and has to leave.')}
${T('00:58', 'The other one says: if something calls you by your name out of a dark place, and you don\'t know for certain who it is...')}
${T('01:07', 'don\'t answer.')}
${T('01:11', 'Because answering is consent. And consent is the whole of the matter.')}
${T('01:19', 'I have underlined that so hard I went through the paper.')}`
  },
  {
    id: 't04', label: 'MAR, the barn', where: 'nailed inside the Colliery Rd barn',
    html: hdr('MAR, the barn', 'nailed to a joist inside the Colliery Road barn') + `
${T('00:00', 'The barn on Colliery has a hex sign on it. They all do. They\'re everywhere out here, they\'re just folk art, they\'re rosettes, they\'re for luck and rain and keeping the cows healthy.')}
${T('00:14', 'This one\'s been painted over. White, thick, sloppy, recent-ish.')}
${T('00:21', 'I scraped a corner of it with my keys.')}
${T('00:26', '[scraping, forty seconds]')}
${T('01:08', 'It\'s got nine points. They don\'t have nine points. Eight, six, twelve, four. I\'ve looked at two hundred of these, nobody does nine.')}
${T('01:20', 'And there\'s a date in it. In tar.')}
${T('01:25', 'Twelve twenty-one.')}
${T('01:29', 'That\'s the solstice. That\'s the longest night of the year.')}`
  },
  {
    id: 't05', label: 'APR. 1963', where: 'library microfilm room, taped under the desk',
    html: hdr('APR. 1963', 'taped under the microfilm desk, Ashgrove State library') + `
${T('00:00', 'February 1963. The Sentinel. I\'ve got it on the screen right now.')}
${T('00:07', 'Nine men were sealed into Kesslerton No. 9 to stop a fire reaching the seam. Alive. That\'s not, the paper doesn\'t say alive, the paper is very careful, but one of the men who bricked the gangway told the reporter he heard them.')}
${T('00:24', 'The order came from Aldous Hale.')}
${T('00:29', 'And here\'s the thing that made me sit down on the floor of the library.')}
${T('00:35', 'Vasko. Prosser. Kowal.')}
${T('00:41', 'Kowal.')}
${T('00:45', 'That\'s my great-grandfather. Štefan. He was twenty-nine.')}
${T('00:53', 'Nobody in my family has ever said his name to me. Not once. Not at a funeral, not at Christmas, never.')}
${T('01:04', 'They said he went back to Slovakia.')}`
  },
  {
    id: 't06', label: 'MAY, what they got', where: 'mine fence, in a coffee can',
    html: hdr('MAY, what they got', 'a coffee can wired to the Kesslerton No. 9 fence') + `
${T('00:00', 'So I want to be really careful and really boring about this part, because if I\'m wrong I\'m a lunatic.')}
${T('00:09', 'Nine men died owed something. That\'s the whole of it. That\'s not magic, that\'s just, a debt is a real thing, people have believed that for ten thousand years.')}
${T('00:22', 'The company paid nine dollars into a subscription fund. Nine. He did that on purpose. That was a joke he made in a newspaper.')}
${T('00:33', 'And afterward the families did something. Somebody in this parish, in 1964, did something to make it hold, and whatever they did, it works, and it costs.')}
${T('00:47', 'Every nine years it costs one.')}
${T('00:52', 'Nineteen to twenty-one. Always local. Always ours. Always September.')}
${T('01:00', 'They\'re not feeding a monster. That\'s what I had wrong for a year.')}
${T('01:07', 'They\'re making payments.')}`
  },
  {
    id: 't07', label: 'JUN, the ones who go', where: 'Victor\'s mattress, under the corner',
    html: hdr('JUN, the ones who go', 'under the corner of a mattress in the rectory') + `
${T('00:00', 'It cannot take somebody who doesn\'t go.')}
${T('00:05', 'That\'s in everything. That\'s in Hohman, that\'s in the Slovak stuff my grandmother said, that\'s in, that\'s in every culture that ever buried anybody.')}
${T('00:16', 'It can\'t come in a door it wasn\'t invited through and it can\'t take a soul that doesn\'t come willingly.')}
${T('00:24', 'So they don\'t take. They arrange.')}
${T('00:29', 'They get the kid to a place, at the hour, with the name said out loud, and they make the kid choose it, and they call that consent, and the awful thing, the actually awful thing...')}
${T('00:44', 'is that it IS consent. It counts. That\'s why it works.')}
${T('00:51', 'They\'re not liars. They\'re worse than that. They\'re accurate.')}`
  },
  {
    id: 't08', label: 'JUL, ma, again', where: 'diner, taped behind the corkboard',
    html: hdr('JUL, ma, again', 'taped to the back of the corkboard, Anthracite Diner') + `
${T('00:00', 'I asked her.')}
${T('00:03', 'I asked my mother, straight out, at the table, if she knew what happened to Krys Sedlák in 2001.')}
${T('00:12', 'She said yes.')}
${T('00:16', '[pause]')}
${T('00:24', 'She said yes and then she got up and she cleared my plate and I hadn\'t finished, and she started crying at the sink with her back to me and she said, "Elena, do not do this, I am asking you as your mother, do not do this."')}
${T('00:41', 'And I said do not do what.')}
${T('00:45', 'And she said: "Do not make me choose between you and everybody."')}
${T('00:53', 'She loves me. I want that on the tape. She loves me and she is in it and both of those are true and I don\'t know what to do with that.')}`
  },
  {
    id: 't09', label: 'AUG, the hale', where: 'graffiti stretch, in the wall of a culvert',
    html: hdr('AUG, the hale', 'wedged in a culvert on the Colliery Road graffiti stretch') + `
${T('00:00', 'It doesn\'t end with a payment. That\'s the part nobody says out loud.')}
${T('00:07', 'A payment buys nine years. It doesn\'t clear the debt.')}
${T('00:13', 'The debt clears with a Hale.')}
${T('00:18', 'That\'s who owed it. Nine men were owed by one man and one family, and the family has been in Philadelphia for fifty years being extremely careful never to come here.')}
${T('00:31', 'There is one Hale left in Pennsylvania under thirty. His name is on a scholarship letter in my brother\'s room, which is how I know it, because my brother has no idea whose money he\'s living on.')}
${T('00:46', 'I\'m not going to say the name on a tape.')}
${T('00:51', 'It\'s a name. Names are the whole problem.')}`
  },
  {
    id: 't10', label: 'SEP 18, three nights', where: 'church, sacristy vestment press',
    html: hdr('SEP 18, three nights', 'in the vestment press, St. Brigid\'s sacristy') + `
${T('00:00', 'Four days.')}
${T('00:04', 'I know what they do now. I know how it goes, I\'ve got the shape of it from three different directions and they all agree.')}
${T('00:14', 'Equinox. The twenty-second. The balance night, the night that\'s exactly half, that\'s the one where a thing that isn\'t alive and isn\'t dead can be put into something.')}
${T('00:29', 'Then three nights watched. Not to honour her. To hold her still while it settles.')}
${T('00:38', 'Then it wears her until the solstice, and on the longest night it collects.')}
${T('00:46', 'And the reason it wears somebody instead of just, showing up...')}
${T('00:53', 'is that nobody says yes to a hole in the ground. People say yes to a person they love.')}
${T('01:04', 'That\'s the entire machine. That\'s it. It\'s a machine for making someone say yes.')}`
  },
  {
    id: 't11', label: 'SEP 20, for wik', where: 'the confessional, wedged under the kneeler',
    html: hdr('SEP 20, for wik', 'wedged under the kneeler in the south confessional') + `
${T('00:00', 'Wiktor, if you\'re listening to this, first of all, I know. Deacon. Not Father. You\'ll correct me from beyond the grave, you absolute nightmare.')}
${T('00:14', '[laughs] [long pause]')}
${T('00:29', 'I\'m going to tell you on Thursday. I\'ve written it all down, it\'s in order, it\'s got the microfilm dates and the flyer dates and the barn and the register and I even have the thing about the snow.')}
${T('00:44', 'You\'re going to believe me, which is the part that scares me. Because then it\'s yours too.')}
${T('00:52', 'I\'m sorry. I thought about not telling you for about a month.')}
${T('00:58', 'But somebody has to be next after me and know what it is, or it just keeps going, forever, quietly, in a town of eleven hundred people, and everyone keeps being nice to each other at the diner.')}
${T('01:14', 'Thursday. Okay. Thursday.')}`
  },
  {
    id: 't12', label: '(unlabelled)', where: 'the bell tower, fourth landing',
    html: hdr('(no label, the ballpoint has been scratched off)', 'the fourth landing of the bell tower') + `
${T('00:00', '[wind. a car door.]')}
${T('00:09', 'It\'s the twenty-second. It\'s eleven at night and I am at the church and I am not waiting until Thursday.')}
${T('00:19', 'Because I saw Marta Vasko\'s car go up Colliery Road an hour ago and there was somebody in the passenger seat and it is the twenty-second of September.')}
${T('00:33', 'I know it\'s stupid to come alone. I know exactly how stupid it is. I have a four-dollar book and a pocket full of salt like an idiot.')}
${T('00:45', 'But here\'s the thing I worked out this afternoon and it\'s the only thing that actually matters, so if this tape is all that\'s left, listen to this part:')}
${T('00:57', '<em>It has to be said out loud.</em>')}
${T('01:02', '<em>Not written. Not thought. Not the name it\'s wearing, the real one, the baptism one, out loud, in the room, by somebody who means it.</em>')}
${T('01:15', '<em>That\'s what gets her back. Six seconds, maybe. Long enough to be a person again.</em>')}
${T('01:23', '<em>And then you burn the paper, and you let her go, and it is the worst thing you will ever do.</em>')}
${T('01:32', 'Do it anyway.')}
${T('01:36', '[pause]')}
${T('01:44', 'Okay. Okay. I\'m going in.')}
${T('01:49', '[a door. then forty-one minutes of nothing.]')}`
  }
];

export const TAPE_BY_ID = Object.fromEntries(TAPES.map(t => [t.id, t]));
