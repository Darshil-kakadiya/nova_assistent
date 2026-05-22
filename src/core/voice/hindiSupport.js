class HindiSupport {
  constructor() {
    this.commandMap = {
      'namaste':'hello','namaskar':'hello','kya haal hai':'how are you',
      'kholo':'open','band karo':'close','screenshot lo':'screenshot',
      'awaaz badhao':'volume up','awaaz kam karo':'volume down',
      'band karo awaaz':'mute','chalu karo':'start',
      'band karo computer':'shutdown','restart karo':'restart',
      'neend mode':'sleep','prakash badhao':'brightness up',
      'prakash kam karo':'brightness down','yaad dilao':'remind me',
      'schedule karo':'schedule','kya kaam hai':'show tasks',
      'aaj ka plan':'today summary','gaana bajao':'play music',
      'gaana band karo':'pause music','agla gaana':'next song',
      'pichla gaana':'previous song','dhundo':'search',
      'khojo':'find','batao':'tell me','code likho':'write code',
      'bug dhundo':'debug','galti theek karo':'fix error',
      'vyayam':'workout','swasthya':'health','pani peeyo':'drink water',
      'paisa':'money','status batao':'status','help karo':'help',
      'meri madad karo':'help','sabhi agents':'agents','itihas':'history',
    };
  }

  isHindi(input) {
    const lower = input.toLowerCase();
    return Object.keys(this.commandMap).some(w => lower.includes(w));
  }

  translate(input) {
    let result = input.toLowerCase().trim();
    for (const [hindi, english] of Object.entries(this.commandMap)) {
      result = result.replace(new RegExp(hindi, 'gi'), english);
    }
    return result.trim().replace(/\s+/g, ' ');
  }

  process(input) {
    if (this.isHindi(input)) {
      const translated = this.translate(input);
      console.log(`\x1b[90m[Hindi→English]: ${translated}\x1b[0m`);
      return translated;
    }
    return input;
  }

  getHindiAck() {
    const phrases = ['Ji zaroor.','Bilkul sir.','Theek hai, karta hoon.','Haan, abhi karta hoon.'];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
}

export default HindiSupport;
