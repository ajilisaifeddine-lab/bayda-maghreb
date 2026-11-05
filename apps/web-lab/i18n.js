/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 ajilisaifeddine-lab
 * This file is part of Bayda Lab. See LICENSE for the full terms.
 */
(function () {
  'use strict';

  var DICT = {
    ar: {
      dir: 'rtl',
      tabLab: '🧪 المختبر',
      tabLearn: '📚 التعلم',
      settingsTitle: '⚙️ الإعدادات',
      toolsSettings: 'الإعدادات',
      toggleDict: 'إخفاء/إظهار القاموس',
      toggleLayout: 'تغيير التخطيط',
      targetLang: 'لغة الهدف',
      algo: 'خوارزميات',
      modeKid: '🐻 طـفـل',
      modeBeginner: '🌱 مـبتدئ',
      modePro: '👨💻 محترف',
      editorTitle: 'المحرر',
      dictTitle: 'القاموس التفاعلي',
      notesTitle: 'الملاحظات',
      outputTitle: 'النتيجة (Output)',
      runBtn: '▶ تشغيل الكود',
      copyTip: 'نسخ',
      downloadTip: 'حفظ النتيجة',
      editorSec: 'المحرر',
      codeLang: 'لغة البرنامج',
      fontSize: 'حجم الخط',
      textSec: 'خيارات النص',
      wordWrap: 'التفاف النص',
      autoBrackets: 'إغلاق الأقواس تلقائيًا',
      learnSec: 'التعلّم والصوت',
      tts: 'القراءة الصوتية',
      realtimeTrans: 'الترجمة الفورية',
      soundFx: 'المؤثرات الصوتية',
      accessSec: 'إمكانية الوصول',
      reduceMotion: 'تقليل الحركة',
      highContrast: 'الوضع عالي التباين',
      dyslexicFont: 'خط عسر القراءة',
      storageSec: 'البيانات والتخزين',
      autoSave: 'حفظ تلقائي للملاحظات',
      resetDefaults: 'استعادة الإعدادات الافتراضية',
      clearAllData: 'حذف جميع البيانات',
      langSec: 'اللغة',
      dialectUiLang: 'اللهجة ولغة الواجهة',
      close: 'إغلاق'
    },
    fr: {
      dir: 'ltr',
      tabLab: '🧪 Labo',
      tabLearn: '📚 Apprendre',
      settingsTitle: '⚙️ Paramètres',
      toolsSettings: 'Paramètres',
      toggleDict: 'Afficher/Masquer le dictionnaire',
      toggleLayout: 'Changer la disposition',
      targetLang: 'Langage cible',
      algo: 'Algorithmes',
      modeKid: '🐻 Enfant',
      modeBeginner: '🌱 Débutant',
      modePro: '👨💻 Pro',
      editorTitle: 'Éditeur',
      dictTitle: 'Dictionnaire interactif',
      notesTitle: 'Notes',
      outputTitle: 'Résultat (Output)',
      runBtn: '▶ Exécuter le code',
      copyTip: 'Copier',
      downloadTip: 'Télécharger le résultat',
      editorSec: 'Éditeur',
      codeLang: 'Langage de programmation',
      fontSize: 'Taille de police',
      textSec: 'Options de texte',
      wordWrap: 'Retour à la ligne',
      autoBrackets: 'Parenthèses automatiques',
      learnSec: 'Apprentissage et Audio',
      tts: 'Synthèse vocale',
      realtimeTrans: 'Traduction instantanée',
      soundFx: 'Effets sonores',
      accessSec: 'Accessibilité',
      reduceMotion: 'Réduire les animations',
      highContrast: 'Contraste élevé',
      dyslexicFont: 'Police dyslexie',
      storageSec: 'Données et stockage',
      autoSave: 'Sauvegarde automatique',
      resetDefaults: 'Réinitialiser les paramètres',
      clearAllData: 'Effacer toutes les données',
      langSec: 'Langue',
      dialectUiLang: 'Dialecte & Langue de l’interface',
      close: 'Fermer'
    },
    en: {
      dir: 'ltr',
      tabLab: '🧪 Lab',
      tabLearn: '📚 Learn',
      settingsTitle: '⚙️ Settings',
      toolsSettings: 'Settings',
      toggleDict: 'Toggle Dictionary',
      toggleLayout: 'Toggle Layout',
      targetLang: 'Target Language',
      algo: 'Algorithms',
      modeKid: '🐻 Kids',
      modeBeginner: '🌱 Beginner',
      modePro: '👨💻 Pro',
      editorTitle: 'Editor',
      dictTitle: 'Interactive Dictionary',
      notesTitle: 'Notes',
      outputTitle: 'Output',
      runBtn: '▶ Run Code',
      copyTip: 'Copy',
      downloadTip: 'Download Output',
      editorSec: 'Editor',
      codeLang: 'Programming Language',
      fontSize: 'Font Size',
      textSec: 'Text Options',
      wordWrap: 'Word Wrap',
      autoBrackets: 'Auto Close Brackets',
      learnSec: 'Learning & Audio',
      tts: 'Text to Speech',
      realtimeTrans: 'Instant Translation',
      soundFx: 'Sound Effects',
      accessSec: 'Accessibility',
      reduceMotion: 'Reduce Motion',
      highContrast: 'High Contrast',
      dyslexicFont: 'Dyslexic Font',
      storageSec: 'Data & Storage',
      autoSave: 'Auto-save Notes',
      resetDefaults: 'Reset Defaults',
      clearAllData: 'Clear All Data',
      langSec: 'Language',
      dialectUiLang: 'Dialect & UI Language',
      close: 'Close'
    },
    es: {
      dir: 'ltr',
      tabLab: '🧪 Laboratorio',
      tabLearn: '📚 Aprender',
      settingsTitle: '⚙️ Ajustes',
      toolsSettings: 'Ajustes',
      toggleDict: 'Alternar diccionario',
      toggleLayout: 'Cambiar diseño',
      targetLang: 'Lenguaje objetivo',
      algo: 'Algoritmos',
      modeKid: '🐻 Niños',
      modeBeginner: '🌱 Principiante',
      modePro: '👨💻 Pro',
      editorTitle: 'Editor',
      dictTitle: 'Diccionario interactivo',
      notesTitle: 'Notas',
      outputTitle: 'Resultado (Output)',
      runBtn: '▶ Ejecutar código',
      copyTip: 'Copiar',
      downloadTip: 'Guardar resultado',
      editorSec: 'Editor',
      codeLang: 'Lenguaje de programación',
      fontSize: 'Tamaño de fuente',
      textSec: 'Opciones de texto',
      wordWrap: 'Ajuste de línea',
      autoBrackets: 'Cierre automático de corchetes',
      learnSec: 'Aprendizaje y Audio',
      tts: 'Lectura de voz',
      realtimeTrans: 'Traducción instantánea',
      soundFx: 'Efectos de sonido',
      accessSec: 'Accesibilidad',
      reduceMotion: 'Reducir movimiento',
      highContrast: 'Alto contraste',
      dyslexicFont: 'Fuente para dislexia',
      storageSec: 'Datos y almacenamiento',
      autoSave: 'Guardado automático',
      resetDefaults: 'Restablecer ajustes',
      clearAllData: 'Borrar todos los datos',
      langSec: 'Idioma',
      dialectUiLang: 'Dialecto e idioma de interfaz',
      close: 'Cerrar'
    },
    it: {
      dir: 'ltr',
      tabLab: '🧪 Laboratorio',
      tabLearn: '📚 Imparare',
      settingsTitle: '⚙️ Impostazioni',
      toolsSettings: 'Impostazioni',
      toggleDict: 'Mostra/Nascondi dizionario',
      toggleLayout: 'Cambia layout',
      targetLang: 'Linguaggio target',
      algo: 'Algoritmi',
      modeKid: '🐻 Bambini',
      modeBeginner: '🌱 Principiante',
      modePro: '👨💻 Pro',
      editorTitle: 'Editor',
      dictTitle: 'Dizionario interattivo',
      notesTitle: 'Note',
      outputTitle: 'Risultato (Output)',
      runBtn: '▶ Esegui codice',
      copyTip: 'Copia',
      downloadTip: 'Salva output',
      editorSec: 'Editor',
      codeLang: 'Linguaggio di programmazione',
      fontSize: 'Dimensione carattere',
      textSec: 'Opzioni testo',
      wordWrap: 'A capo automatico',
      autoBrackets: 'Chiusura automatica parentesi',
      learnSec: 'Apprendimento e Audio',
      tts: 'Sintesi vocale',
      realtimeTrans: 'Traduzione istantanea',
      soundFx: 'Effetti sonori',
      accessSec: 'Accessibilità',
      reduceMotion: 'Riduci animazioni',
      highContrast: 'Contrasto elevato',
      dyslexicFont: 'Carattere dislessia',
      storageSec: 'Dati e archiviazione',
      autoSave: 'Salvataggio automatico',
      resetDefaults: 'Ripristina predefiniti',
      clearAllData: 'Cancella tutti i dati',
      langSec: 'Lingua',
      dialectUiLang: 'Dialetto e lingua dell’interfaccia',
      close: 'Chiudi'
    },
    de: {
      dir: 'ltr',
      tabLab: '🧪 Labor',
      tabLearn: '📚 Lernen',
      settingsTitle: '⚙️ Einstellungen',
      toolsSettings: 'Einstellungen',
      toggleDict: 'Wörterbuch umschalten',
      toggleLayout: 'Layout wechseln',
      targetLang: 'Zielsprache',
      algo: 'Algorithmen',
      modeKid: '🐻 Kinder',
      modeBeginner: '🌱 Anfänger',
      modePro: '👨💻 Profi',
      editorTitle: 'Editor',
      dictTitle: 'Interaktives Wörterbuch',
      notesTitle: 'Notizen',
      outputTitle: 'Ausgabe (Output)',
      runBtn: '▶ Code ausführen',
      copyTip: 'Kopieren',
      downloadTip: 'Ausgabe speichern',
      editorSec: 'Editor',
      codeLang: 'Programmiersprache',
      fontSize: 'Schriftgröße',
      textSec: 'Textoptionen',
      wordWrap: 'Zeilenumbruch',
      autoBrackets: 'Klammern autom. schließen',
      learnSec: 'Lernen & Audio',
      tts: 'Sprachausgabe',
      realtimeTrans: 'Sofortübersetzung',
      soundFx: 'Toneffekte',
      accessSec: 'Barrierefreiheit',
      reduceMotion: 'Bewegung reduzieren',
      highContrast: 'Hoher Kontrast',
      dyslexicFont: 'Legasthenie-Schrift',
      storageSec: 'Daten & Speicher',
      autoSave: 'Autom. speichern',
      resetDefaults: 'Auf Standard zurücksetzen',
      clearAllData: 'Alle Daten löschen',
      langSec: 'Sprache',
      dialectUiLang: 'Dialekt & Benutzeroberfläche',
      close: 'Schließen'
    },
    nl: {
      dir: 'ltr',
      tabLab: '🧪 Lab',
      tabLearn: '📚 Leren',
      settingsTitle: '⚙️ Instellingen',
      toolsSettings: 'Instellingen',
      toggleDict: 'Woordenboek tonen/verbergen',
      toggleLayout: 'Layout wijzigen',
      targetLang: 'Doeltaal',
      algo: 'Algoritmen',
      modeKid: '🐻 Kinderen',
      modeBeginner: '🌱 Beginner',
      modePro: '👨💻 Pro',
      editorTitle: 'Editor',
      dictTitle: 'Interactief woordenboek',
      notesTitle: 'Notities',
      outputTitle: 'Uitvoer (Output)',
      runBtn: '▶ Code uitvoeren',
      copyTip: 'Kopiëren',
      downloadTip: 'Uitvoer opslaan',
      editorSec: 'Editor',
      codeLang: 'Programmeertaal',
      fontSize: 'Lettergrootte',
      textSec: 'Tekstopties',
      wordWrap: 'Tekstterugloop',
      autoBrackets: 'Haakjes autom. sluiten',
      learnSec: 'Leren & Audio',
      tts: 'Tekst-naar-spraak',
      realtimeTrans: 'Directe vertaling',
      soundFx: 'Geluidseffecten',
      accessSec: 'Toegankelijkheid',
      reduceMotion: 'Beweging verminderen',
      highContrast: 'Hoog contrast',
      dyslexicFont: 'Dyslexie-lettertype',
      storageSec: 'Gegevens en opslag',
      autoSave: 'Automatisch opslaan',
      resetDefaults: 'Standaardinstellingen herstellen',
      clearAllData: 'Alle gegevens wissen',
      langSec: 'Taal',
      dialectUiLang: 'Dialect & Interfacetaal',
      close: 'Sluiten'
    }
  };

  function apply(id) {
    var lang = DICT[id] ? id : 'ar';
    var t = DICT[lang];
    var H = document.documentElement;
    var B = document.body;

    H.lang = lang;
    H.dir = t.dir;
    B.dataset.uiLang = lang;

    // Tabs
    var tabLab = document.getElementById('tab-lab-btn');
    if (tabLab) tabLab.textContent = t.tabLab;
    var tabLearn = document.getElementById('tab-learn-btn');
    if (tabLearn) tabLearn.textContent = t.tabLearn;

    // Run button
    var runBtn = document.getElementById('run-btn');
    if (runBtn) runBtn.textContent = t.runBtn;

    // Header buttons titles
    var setBtn = document.querySelector('.tools-row .icon-btn');
    if (setBtn) setBtn.title = t.toolsSettings;
    var dictToggle = document.getElementById('side-toggle-btn');
    if (dictToggle) dictToggle.title = t.toggleDict;
    var targetSel = document.getElementById('target-lang');
    if (targetSel) {
      targetSel.title = t.targetLang;
      var algoOpt = targetSel.querySelector('option[value="algo"]');
      if (algoOpt) algoOpt.textContent = t.algo;
    }

    // Modes dropdown
    var modeSel = document.getElementById('mode-select');
    if (modeSel) {
      var optKid = modeSel.querySelector('option[value="kid"]');
      if (optKid) optKid.textContent = t.modeKid;
      var optBeg = modeSel.querySelector('option[value="beginner"]');
      if (optBeg) optBeg.textContent = t.modeBeginner;
      var optPro = modeSel.querySelector('option[value="pro"]');
      if (optPro) optPro.textContent = t.modePro;
    }

    // Panes headers
    var edHeader = document.querySelector('#editor-pane .pane-header span');
    if (edHeader) edHeader.textContent = t.editorTitle;
    var dictHeader = document.querySelector('#dict-pane .pane-header span');
    if (dictHeader) dictHeader.textContent = t.dictTitle;
    var outHeader = document.querySelector('#output-pane .pane-header span');
    if (outHeader) outHeader.textContent = t.outputTitle;
    var noteHeader = document.querySelector('#notes-pane .pane-header span');
    if (noteHeader) noteHeader.textContent = t.notesTitle;

    // Settings Modal
    var sm = document.getElementById('settings-modal');
    if (sm) {
      var h2 = sm.querySelector('h2');
      if (h2) h2.textContent = t.settingsTitle;
      var secs = sm.querySelectorAll('.st-section');
      if (secs[0]) secs[0].textContent = t.editorSec;
      if (secs[1]) secs[1].textContent = t.textSec;
      if (secs[2]) secs[2].textContent = t.learnSec;
      if (secs[3]) secs[3].textContent = t.accessSec;
      if (secs[4]) secs[4].textContent = t.storageSec;

      var labels = sm.querySelectorAll('.st-label');
      labels.forEach(function (lbl) {
        var txt = lbl.textContent.trim();
        if (txt.includes('لغة البرنامج') || txt.includes('Programming Language') || txt.includes('Langage')) lbl.textContent = t.codeLang;
        else if (txt.includes('حجم الخط') || txt.includes('Font Size') || txt.includes('Taille')) lbl.textContent = t.fontSize;
        else if (txt.includes('التفاف') || txt.includes('Wrap') || txt.includes('Retour')) lbl.textContent = t.wordWrap;
        else if (txt.includes('إغلاق الأقواس') || txt.includes('Brackets') || txt.includes('Parenthèses')) lbl.textContent = t.autoBrackets;
        else if (txt.includes('القراءة الصوتية') || txt.includes('Speech') || txt.includes('Vocale')) lbl.textContent = t.tts;
        else if (txt.includes('الترجمة الفورية') || txt.includes('Translation') || txt.includes('Traduction')) lbl.textContent = t.realtimeTrans;
        else if (txt.includes('المؤثرات الصوتية') || txt.includes('Sound') || txt.includes('Sonores')) lbl.textContent = t.soundFx;
        else if (txt.includes('تقليل الحركة') || txt.includes('Motion') || txt.includes('Animations')) lbl.textContent = t.reduceMotion;
        else if (txt.includes('التباين') || txt.includes('Contrast') || txt.includes('Contraste')) lbl.textContent = t.highContrast;
        else if (txt.includes('عسر القراءة') || txt.includes('Dyslexic') || txt.includes('Dyslexie')) lbl.textContent = t.dyslexicFont;
        else if (txt.includes('حفظ تلقائي') || txt.includes('Auto-save') || txt.includes('Sauvegarde')) lbl.textContent = t.autoSave;
        else if (txt.includes('اللهجة ولغة الواجهة') || txt.includes('Dialect & UI Language')) lbl.textContent = t.dialectUiLang;
      });

      var resetBtn = document.getElementById('st-reset');
      if (resetBtn) resetBtn.textContent = t.resetDefaults;
      var clearBtn = document.getElementById('st-clear-all');
      if (clearBtn) clearBtn.textContent = t.clearAllData;
    }

    try {
      localStorage.setItem('bayda_ui_lang', lang);
    } catch (e) {}

    document.dispatchEvent(new CustomEvent('bayda:uilang_changed', { detail: { lang: lang } }));
  }

  
  async function loadAndApply(id) {
    var lang = id || "ar";
    if (DICT[lang]) {
      apply(lang);
      return DICT[lang];
    }
    try {
      var res = await fetch("locales/" + encodeURIComponent(lang) + ".json");
      if (res.ok) {
        var data = await res.json();
        DICT[lang] = data;
        apply(lang);
        return data;
      }
    } catch (err) {
      console.warn("Could not load dynamic locale, falling back to Arabic", err);
    }
    apply("ar");
    return DICT.ar;
  }

  function init() {
    var saved = 'ar';
    try {
      saved = localStorage.getItem('bayda_ui_lang') || 'ar';
    } catch (e) {}
    // إذا كان المحفوظ لهجة وليس لغة عالمية، تبقى لغة الواجهة الافتراضية عربية
    if (!DICT[saved]) saved = 'ar';
    apply(saved);
  }

  window.BaydaI18n = {
    dict: DICT,
    apply: apply,
    loadAndApply: loadAndApply,
    init: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
