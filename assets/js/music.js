// Volume settings
let volume;
if (JSON.parse(localStorage.getItem("volumeData")) == undefined) {
    volume = {
        master: 100 / 100,
        bgm: (80 / 100) / 2,
        sfx: 100 / 100
    }
} else {
    volume = JSON.parse(localStorage.getItem("volumeData"));
}

// Safe wrapper for undefined sounds
const safeSoundWrapper = {
    play: () => {},
    stop: () => {},
    pause: () => {},
    volume: () => {},
    fade: () => {}
};

// BGM
let bgmDungeon = Object.create(safeSoundWrapper);
let bgmBattleMain = Object.create(safeSoundWrapper);
let bgmBattleBoss = Object.create(safeSoundWrapper);
let bgmBattleGuardian = Object.create(safeSoundWrapper);

// SFX
let sfxEncounter = Object.create(safeSoundWrapper);
let sfxEnemyDeath = Object.create(safeSoundWrapper);
let sfxAttack = Object.create(safeSoundWrapper);
let sfxLvlUp = Object.create(safeSoundWrapper);
let sfxConfirm = Object.create(safeSoundWrapper);
let sfxDecline = Object.create(safeSoundWrapper);
let sfxDeny = Object.create(safeSoundWrapper);
let sfxEquip = Object.create(safeSoundWrapper);
let sfxUnequip = Object.create(safeSoundWrapper);
let sfxOpen = Object.create(safeSoundWrapper);
let sfxPause = Object.create(safeSoundWrapper);
let sfxUnpause = Object.create(safeSoundWrapper);
let sfxSell = Object.create(safeSoundWrapper);
let sfxItem = Object.create(safeSoundWrapper);
let sfxBuff = Object.create(safeSoundWrapper);

const setVolume = () => {
    // ===== BGM =====
    bgmDungeon = new Howl({
        src: ['./assets/bgm/dungeon.webm', './assets/bgm/dungeon.mp3'],
        volume: volume.bgm * volume.master,
        loop: true
    });

    bgmBattleMain = new Howl({
        src: ['./assets/bgm/battle_main.webm', './assets/bgm/battle_main.mp3'],
        volume: volume.bgm * volume.master,
        loop: true
    });

    bgmBattleBoss = new Howl({
        src: ['./assets/bgm/battle_boss.webm', './assets/bgm/battle_boss.mp3'],
        volume: volume.bgm * volume.master,
        loop: true
    });

    bgmBattleGuardian = new Howl({
        src: ['./assets/bgm/battle_guardian.webm', './assets/bgm/battle_guardian.mp3'],
        volume: volume.bgm * volume.master,
        loop: true
    });

    // ===== SFX =====
    sfxEncounter = new Howl({
        src: ['./assets/sfx/encounter.wav'],
        volume: volume.sfx * volume.master
    });

    sfxCombatEnd = new Howl({
        src: ['./assets/sfx/combat_end.wav'],
        volume: volume.sfx * volume.master
    });

    sfxAttack = new Howl({
        src: ['./assets/sfx/attack.wav'],
        volume: volume.sfx * volume.master
    });

    sfxLvlUp = new Howl({
        src: ['./assets/sfx/level_up.wav'],
        volume: volume.sfx * volume.master
    });

    sfxConfirm = new Howl({
        src: ['./assets/sfx/confirm.wav'],
        volume: volume.sfx * volume.master
    });

    sfxDecline = new Howl({
        src: ['./assets/sfx/decline.wav'],
        volume: volume.sfx * volume.master
    });

    sfxDeny = new Howl({
        src: ['./assets/sfx/denied.wav'],
        volume: volume.sfx * volume.master
    });

    sfxEquip = new Howl({
        src: ['./assets/sfx/equip.wav'],
        volume: volume.sfx * volume.master
    });

    sfxUnequip = new Howl({
        src: ['./assets/sfx/unequip.wav'],
        volume: volume.sfx * volume.master
    });

    sfxOpen = new Howl({
        src: ['./assets/sfx/hover.wav'],
        volume: volume.sfx * volume.master
    });

    sfxPause = new Howl({
        src: ['./assets/sfx/pause.wav'],
        volume: volume.sfx * volume.master
    });

    sfxUnpause = new Howl({
        src: ['./assets/sfx/unpause.wav'],
        volume: volume.sfx * volume.master
    });

    sfxSell = new Howl({
        src: ['./assets/sfx/sell.wav'],
        volume: volume.sfx * volume.master
    });

    sfxItem = new Howl({
        src: ['./assets/sfx/item_use.wav'],
        volume: volume.sfx * volume.master
    });

    sfxBuff = new Howl({
        src: ['./assets/sfx/buff.wav'],
        volume: volume.sfx * volume.master
    });
}

// Safe play function that won't crash if sound not loaded
window.safePlay = function(sound) {
    try {
        if (sound && typeof sound.play === 'function') {
            sound.play();
        }
    } catch (e) {
        // Sound not loaded yet, ignore
    }
};

window.safeStop = function(sound) {
    try {
        if (sound && typeof sound.stop === 'function') {
            sound.stop();
        }
    } catch (e) {
        // Sound not loaded yet, ignore
    }
};

document.querySelector("#title-screen").addEventListener("click", function () {
    setVolume();
    safePlay(sfxOpen);
});
