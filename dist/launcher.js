// Launcher translations only. Original in-game language settings remain independent.
(() => {
  'use strict';
  const launcher = document.getElementById('launcher');
  if (!launcher || new URLSearchParams(location.search).has('map')) return;
  const KEY = 'cofLauncherLanguage';
  const names = {english:['en','English'],spanish:['es','Español'],french:['fr','Français'],
    german:['de','Deutsch'],dutch:['nl','Nederlands'],norwegian:['no','Norsk'],swedish:['sv','Svenska']};
  const strings = {
    english: {
      tag:'Unofficial browser port · Alpha',play:'Play',language:'Language',status:'In the launcher',
      note:'The first load may take a while. Your saves stay in this browser.',
      headings:['Controls','Before playing','Alpha progress'],
      keys:['Move','Sprint','Crouch and jump','Use and pick up objects','Phone flashlight','Bag (inventory)',
        'Quick selection','Reload','Attack and secondary action','Menu and release the mouse'],mouse:'Left / right click',
      requirements:['Desktop computer with keyboard and mouse.','Desktop browser with WebGL 2.',
        'An internet connection for resources not yet downloaded.','Headphones recommended.',
        'Save using the original in-game tape recorder.'],
      features:['Eleven prepared maps from the prologue, prelude and first chapter.',
        'Original bag, health and stamina bars, phone and messages.','Phone combinations with the knife and Glock.',
        'Save/load checks for scenes, doors, weapons and voices.','Original steps, sounds and game resources.',
        'Seven original subtitle languages, selected in the game menu.'],
      next:'In development: ammunition HUD, more weapons and continued campaign validation.',
      credit:'Unofficial port published with permission from its author. Non-profit: no ads, donations or payments.',
      original:'Play the original for free at ',rights:'Game resources © Team Psykskallar; distributed with permission, outside the code license.',
      code:'Port code: GPL-3.0',license:'license',source:'source code',engine:'Engine',author:'Web port',
      title:'Choose your language',hint:'Launcher language. Choose the game subtitle language in its original menu.'
    },
    spanish: {
      tag:'Port de navegador no oficial · Alpha',play:'Jugar',language:'Idioma',status:'En el launcher',
      note:'La primera carga puede tardar. Tus partidas se guardan en este navegador.',
      headings:['Controles','Antes de jugar','Avances de la Alpha'],
      keys:['Moverse','Correr','Agacharse y saltar','Usar y recoger objetos','Linterna del teléfono','Bolso (inventario)',
        'Selección rápida','Recargar','Atacar y acción secundaria','Menú y soltar el ratón'],mouse:'Clic izquierdo / derecho',
      requirements:['Ordenador con teclado y ratón.','Navegador de escritorio con WebGL 2.',
        'Conexión para los recursos que aún no se han descargado.','Auriculares recomendados.',
        'Guarda con la grabadora de cinta original del juego.'],
      features:['Once mapas preparados del prólogo, preludio y primer capítulo.',
        'Bolso, barras de vida y energía, teléfono y mensajes originales.','Combinaciones de teléfono con navaja y Glock.',
        'Pruebas de guardado/carga de escenas, puertas, armas y voces.','Pisadas, sonidos y recursos originales.',
        'Siete idiomas originales de subtítulos, elegidos en el menú del juego.'],
      next:'En desarrollo: HUD de munición, más armas y validación continua de la campaña.',
      credit:'Port no oficial publicado con permiso de su autor. Sin fines de lucro: sin anuncios, donaciones ni pagos.',
      original:'Juega gratis al original en ',rights:'Recursos del juego © Team Psykskallar; distribuidos con permiso y fuera de la licencia del código.',
      code:'Código del port: GPL-3.0',license:'licencia',source:'código fuente',engine:'Motor',author:'Port web',
      title:'Elige tu idioma',hint:'Idioma del launcher. Elige los subtítulos del juego en su menú original.'
    },
    french: {
      tag:'Portage navigateur non officiel · Alpha',play:'Jouer',language:'Langue',status:'Dans le lanceur',
      note:'Le premier chargement peut prendre du temps. Vos sauvegardes restent dans ce navigateur.',
      headings:['Commandes','Avant de jouer','Avancées de l’Alpha'],
      keys:['Se déplacer','Courir','S’accroupir et sauter','Utiliser et ramasser','Lampe du téléphone','Sac (inventaire)',
        'Sélection rapide','Recharger','Attaque et action secondaire','Menu et libérer la souris'],mouse:'Clic gauche / droit',
      requirements:['Ordinateur avec clavier et souris.','Navigateur de bureau avec WebGL 2.',
        'Connexion pour les ressources pas encore téléchargées.','Casque recommandé.',
        'Sauvegardez avec le magnétophone original du jeu.'],
      features:['Onze cartes préparées du prologue, du prélude et du premier chapitre.',
        'Sac, barres de vie et d’endurance, téléphone et messages d’origine.','Téléphone combiné au couteau ou au Glock.',
        'Tests de sauvegarde/chargement des scènes, portes, armes et voix.','Pas, sons et ressources d’origine.',
        'Sept langues de sous-titres d’origine, à choisir dans le menu du jeu.'],
      next:'En développement : affichage des munitions, autres armes et validation de la campagne.',
      credit:'Portage non officiel publié avec l’autorisation de son auteur. Sans but lucratif : ni publicité, ni dons, ni paiements.',
      original:'Jouez gratuitement à l’original sur ',rights:'Ressources du jeu © Team Psykskallar ; distribuées avec autorisation, hors licence du code.',
      code:'Code du portage : GPL-3.0',license:'licence',source:'code source',engine:'Moteur',author:'Portage web',
      title:'Choisissez votre langue',hint:'Langue du lanceur. Choisissez les sous-titres dans le menu original du jeu.'
    },
    german: {
      tag:'Inoffizielle Browser-Portierung · Alpha',play:'Spielen',language:'Sprache',status:'Im Launcher',
      note:'Der erste Ladevorgang kann dauern. Spielstände bleiben in diesem Browser.',
      headings:['Steuerung','Vor dem Spielen','Stand der Alpha'],
      keys:['Bewegen','Sprinten','Ducken und springen','Benutzen und aufheben','Handy-Taschenlampe','Tasche (Inventar)',
        'Schnellauswahl','Nachladen','Angriff und zweite Aktion','Menü und Maus freigeben'],mouse:'Links- / Rechtsklick',
      requirements:['Computer mit Tastatur und Maus.','Desktop-Browser mit WebGL 2.',
        'Internet für noch nicht heruntergeladene Ressourcen.','Kopfhörer empfohlen.',
        'Mit dem originalen Kassettenrekorder im Spiel speichern.'],
      features:['Elf vorbereitete Karten aus Prolog, Vorspiel und erstem Kapitel.',
        'Originale Tasche, Lebens- und Ausdauerbalken, Handy und Nachrichten.','Handy zusammen mit Messer oder Glock.',
        'Speicher-/Ladetests für Szenen, Türen, Waffen und Stimmen.','Originale Schritte, Sounds und Spielressourcen.',
        'Sieben originale Untertitelsprachen im Spielmenü.'],
      next:'In Entwicklung: Munitionsanzeige, weitere Waffen und Prüfung der Kampagne.',
      credit:'Inoffizielle Portierung mit Genehmigung des Autors. Nicht kommerziell: keine Werbung, Spenden oder Zahlungen.',
      original:'Das Original kostenlos spielen auf ',rights:'Spielressourcen © Team Psykskallar; mit Genehmigung verbreitet, nicht unter der Codelizenz.',
      code:'Portierungscode: GPL-3.0',license:'Lizenz',source:'Quellcode',engine:'Engine',author:'Web-Portierung',
      title:'Sprache auswählen',hint:'Sprache des Launchers. Die Untertitelsprache wird im Originalmenü des Spiels gewählt.'
    },
    dutch: {
      tag:'Onofficiële browserport · Alpha',play:'Spelen',language:'Taal',status:'In de launcher',
      note:'De eerste keer laden kan even duren. Je opgeslagen spellen blijven in deze browser.',
      headings:['Besturing','Voor je begint','Voortgang van de Alpha'],
      keys:['Bewegen','Sprinten','Bukken en springen','Gebruiken en oppakken','Zaklamp van de telefoon','Tas (inventaris)',
        'Snelle selectie','Herladen','Aanval en secundaire actie','Menu en muis vrijgeven'],mouse:'Links- / rechtsklik',
      requirements:['Computer met toetsenbord en muis.','Desktopbrowser met WebGL 2.',
        'Internet voor nog niet gedownloade bestanden.','Hoofdtelefoon aanbevolen.',
        'Sla op met de originele cassetterecorder in het spel.'],
      features:['Elf voorbereide kaarten uit de proloog, het voorspel en het eerste hoofdstuk.',
        'Originele tas, levens- en uithoudingsbalken, telefoon en berichten.','Telefoon samen met mes of Glock.',
        'Opslag-/laadtests voor scènes, deuren, wapens en stemmen.','Originele voetstappen, geluiden en spelbestanden.',
        'Zeven originele ondertiteltalen via het spelmenu.'],
      next:'In ontwikkeling: munitie-HUD, meer wapens en verdere controle van de campagne.',
      credit:'Onofficiële port met toestemming van de auteur. Zonder winstoogmerk: geen advertenties, donaties of betalingen.',
      original:'Speel het origineel gratis op ',rights:'Spelbestanden © Team Psykskallar; verspreid met toestemming, buiten de licentie van de code.',
      code:'Code van de port: GPL-3.0',license:'licentie',source:'broncode',engine:'Engine',author:'Webport',
      title:'Kies je taal',hint:'Taal van de launcher. Kies de ondertiteling in het originele spelmenu.'
    },
    norwegian: {
      tag:'Uoffisiell nettleserport · Alpha',play:'Spill',language:'Språk',status:'I startmenyen',
      note:'Første innlasting kan ta tid. Lagringene blir i denne nettleseren.',
      headings:['Kontroller','Før du spiller','Status for Alpha'],
      keys:['Bevegelse','Løpe','Dukke og hoppe','Bruke og plukke opp','Telefonens lommelykt','Veske (inventar)',
        'Hurtigvalg','Lade om','Angrep og sekundær handling','Meny og slipp musepekeren'],mouse:'Venstre- / høyreklikk',
      requirements:['Datamaskin med tastatur og mus.','Skrivebordsnettleser med WebGL 2.',
        'Internett for ressurser som ikke er lastet ned ennå.','Hodetelefoner anbefales.',
        'Lagre med den originale båndopptakeren i spillet.'],
      features:['Elleve klargjorte kart fra prologen, forspillet og første kapittel.',
        'Original veske, livs- og utholdenhetsmålere, telefon og meldinger.','Telefon sammen med kniv eller Glock.',
        'Lagrings-/lastetester for scener, dører, våpen og stemmer.','Originale fottrinn, lyder og spillressurser.',
        'Sju originale undertekstspråk via spillmenyen.'],
      next:'Under utvikling: ammunisjonsvisning, flere våpen og videre kontroll av kampanjen.',
      credit:'Uoffisiell port med tillatelse fra opphavspersonen. Ikke kommersiell: ingen annonser, donasjoner eller betalinger.',
      original:'Spill originalen gratis på ',rights:'Spillressurser © Team Psykskallar; distribuert med tillatelse, utenfor kodelisensen.',
      code:'Portkode: GPL-3.0',license:'lisens',source:'kildekode',engine:'Motor',author:'Nettport',
      title:'Velg språk',hint:'Språk for startmenyen. Velg undertekster i spillets originalmeny.'
    },
    swedish: {
      tag:'Inofficiell webbläsarport · Alpha',play:'Spela',language:'Språk',status:'I startmenyn',
      note:'Den första inläsningen kan ta tid. Dina sparningar stannar i den här webbläsaren.',
      headings:['Kontroller','Innan du spelar','Läget i Alpha'],
      keys:['Förflyttning','Springa','Huka och hoppa','Använda och plocka upp','Telefonens ficklampa','Väska (inventarium)',
        'Snabbval','Ladda om','Attack och sekundär handling','Meny och släpp muspekaren'],mouse:'Vänster- / högerklick',
      requirements:['Dator med tangentbord och mus.','Skrivbordswebbläsare med WebGL 2.',
        'Internet för resurser som ännu inte har hämtats.','Hörlurar rekommenderas.',
        'Spara med spelets ursprungliga bandspelare.'],
      features:['Elva förberedda banor från prologen, förspelet och första kapitlet.',
        'Ursprunglig väska, livs- och uthållighetsmätare, telefon och meddelanden.','Telefon tillsammans med kniv eller Glock.',
        'Tester av sparning/laddning för scener, dörrar, vapen och röster.','Ursprungliga fotsteg, ljud och spelresurser.',
        'Sju ursprungliga undertextspråk via spelmenyn.'],
      next:'Under utveckling: ammunitionsvisning, fler vapen och fortsatt kontroll av kampanjen.',
      credit:'Inofficiell port med upphovspersonens tillstånd. Icke-kommersiell: inga annonser, donationer eller betalningar.',
      original:'Spela originalet gratis på ',rights:'Spelresurser © Team Psykskallar; distribueras med tillstånd, utanför kodens licens.',
      code:'Portens kod: GPL-3.0',license:'licens',source:'källkod',engine:'Motor',author:'Webbport',
      title:'Välj språk',hint:'Startmenyns språk. Välj undertexter i spelets ursprungliga meny.'
    }
  };
  let selected = null;
  try {const saved=localStorage.getItem(KEY);if(Object.hasOwn(strings,saved))selected=saved;} catch (_) {}
  const wrap=launcher.querySelector('.lb-wrap'), play=document.getElementById('play');
  const links=[...launcher.querySelectorAll('.lb-credits a')].map(a=>a.cloneNode(true));
  const change=document.createElement('button');change.type='button';change.id='launcher-language-change';change.className='lb-lang-change';
  launcher.querySelector('.lb-hero').prepend(change);
  const gate=document.createElement('div');gate.id='launcher-language';gate.className='lb-language';gate.setAttribute('role','dialog');
  gate.setAttribute('aria-modal','true');gate.setAttribute('aria-labelledby','launcher-language-title');
  const card=document.createElement('div');card.className='lb-language-card';
  const heading=document.createElement('h1');heading.id='launcher-language-title';
  const hint=document.createElement('p'),choices=document.createElement('div');choices.className='lb-language-choices';
  card.append(heading,hint,choices);gate.append(card);launcher.append(gate);
  const text=(selector,value)=>{launcher.querySelector(selector).textContent=value;};
  const setList=(nodes,values)=>nodes.forEach((node,i)=>{node.textContent=values[i];});
  function labels(language){
    const s=strings[language];document.documentElement.lang=names[language][0];
    text('.lb-tag',s.tag);play.textContent=s.play;text('.lb-note',s.note);
    change.textContent=s.language+' · '+names[language][1];
    setList([...launcher.querySelectorAll('.lb-card h2')],s.headings);
    setList([...launcher.querySelectorAll('.lb-keys dd')],s.keys);
    text('.lb-keys dt:nth-of-type(9)',s.mouse);
    text('.lb-keys dt:nth-of-type(3) kbd:last-child',({english:'Space',spanish:'Espacio',french:'Espace',german:'Leertaste',dutch:'Spatie',norwegian:'Mellomrom',swedish:'Mellanslag'})[language]);
    const cards=launcher.querySelectorAll('.lb-card');setList([...cards[1].querySelectorAll('li')],s.requirements);
    setList([...cards[2].querySelectorAll('li')],s.features);text('.lb-next',s.next);
    const credits=launcher.querySelector('.lb-credits'),p=document.createElement('p'),q=document.createElement('p');
    const brand=document.createElement('strong');brand.textContent='Cry of Fear';
    const original=links[0].cloneNode(true),license=links[1].cloneNode(true),source=links[2].cloneNode(true),engine=links[3].cloneNode(true);
    license.textContent=s.license;source.textContent=s.source;
    p.append(brand,' © Team Psykskallar (Andreas Rönnberg). '+s.credit+' '+s.original,original,'.');
    q.append(s.rights+' '+s.code+' (',license,' · ',source,'). '+s.engine+': ',engine,'. '+s.author+': Putrefacto669.');credits.replaceChildren(p,q);
    heading.textContent=s.title;hint.textContent=s.hint;
    if(!launcher.hidden)document.getElementById('status').textContent=s.status;
  }
  function show(){
    gate.hidden=false;wrap.inert=true;play.disabled=!selected;
    if(!selected){heading.textContent='Choose your language / Elige tu idioma';hint.textContent='Launcher · English · Español · Français · Deutsch · Nederlands · Norsk · Svenska';}
    const target=choices.querySelector(`[data-language="${selected||'english'}"]`);requestAnimationFrame(()=>target.focus());
  }
  function close(){gate.hidden=true;wrap.inert=false;play.disabled=false;change.focus();}
  for(const [language,[code,name]] of Object.entries(names)){
    const b=document.createElement('button');b.type='button';b.lang=code;b.textContent=name;b.dataset.language=language;
    b.addEventListener('click',()=>{selected=language;try{localStorage.setItem(KEY,language);}catch(_){}labels(language);close();});choices.append(b);
  }
  window.addEventListener('keydown',e=>{
    if(gate.hidden)return;
    if(e.key==='Escape'&&selected){e.preventDefault();e.stopImmediatePropagation();close();}
    if(e.key!=='Tab')return;
    const buttons=[...choices.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);
    if(e.shiftKey&&(i===0||i<0)){e.preventDefault();buttons.at(-1).focus();}
    else if(!e.shiftKey&&(i===buttons.length-1||i<0)){e.preventDefault();buttons[0].focus();}
  },true);
  change.addEventListener('click',show);
  window.CoFLauncher=Object.freeze({get language(){return selected;},t:key=>(strings[selected||'english'][key]||key),languages:Object.freeze(Object.keys(names))});
  if(selected){labels(selected);gate.hidden=true;play.disabled=false;}else{play.disabled=true;show();}
})();
