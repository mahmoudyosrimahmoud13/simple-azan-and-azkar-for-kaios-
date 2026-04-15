var cities = ["Cairo", "Giza", "Alexandria", "Dakahlia", "Red Sea", "Beheira", "Faiyum", "Gharbia", "Ismailia", "Monufia", "Minya", "Qalyubia", "New Valley", "Suez", "Aswan", "Asyut", "Beni Suef", "Port Said", "Damietta", "Al Sharqia", "South Sinai", "Kafr El Sheikh", "Matrouh", "Luxor", "Qena", "North Sinai", "Sohag"];
var cityAr = ["القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "السويس", "أسوان", "أسيوط", "بني سويف", "بورسعيد", "دمياط", "الشرقية", "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", "سوهاج"];

var focusIdx = 0;
var cIdx = parseInt(localStorage.getItem('saved_city_idx')) || 0;
var isMenuOpen = false;
var isHelpOpen = false;
var menuIdx = cIdx;
var alarmActive = false;

var fallbackHadiths = [
    { text: "قال رسول الله ﷺ: 'من سلك طريقًا يطلب فيه علمًا، سلك الله به طريقًا إلى الجنة'", source: "رواه مسلم" },
    { text: "قال رسول الله ﷺ: 'إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى'", source: "متفق عليه" },
    { text: "قال رسول الله ﷺ: 'لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه'", source: "متفق عليه" }
];

var hadithsList = JSON.parse(localStorage.getItem('saved_hadiths')) || fallbackHadiths;
var data = JSON.parse(localStorage.getItem('azan_pro_data')) || {
    times: { "Fajr": "04:00", "Dhuhr": "12:00", "Asr": "15:30", "Maghrib": "18:30", "Isha": "19:50" },
    hijri: "1 رمضان 1447 (9)"
};

var audio = new Audio('adhan.mp3');
audio.mozAudioChannelType = 'alarm';

function buildSidebar() {
    var listHTML = "";
    for (var i = 0; i < cityAr.length; i++) {
        listHTML += '<div id="m-item-' + i + '" class="menu-item">' + cityAr[i] + '</div>';
    }
    document.getElementById('menu-list').innerHTML = listHTML;
    document.getElementById('city-box').innerText = cityAr[cIdx];
}

function updateMenuUI() {
    for (var i = 0; i < cityAr.length; i++) {
        document.getElementById('m-item-' + i).className = (i === menuIdx) ? 'menu-item selected-item' : 'menu-item';
    }
    var el = document.getElementById('m-item-' + menuIdx);
    var sidebar = document.getElementById('sidebar');
    if (el && sidebar) {
        sidebar.scrollTop = el.offsetTop - (sidebar.clientHeight / 2) + (el.clientHeight / 2);
    }
}

function toggleMenu() {
    if (isHelpOpen) return;
    isMenuOpen = !isMenuOpen;
    document.getElementById('sidebar').style.right = isMenuOpen ? '0' : '-100%';
    if (isMenuOpen) {
        menuIdx = cIdx;
        updateMenuUI();
        document.getElementById('status-bar').innerText = "اختر بالأسهم واضغط Enter";
    } else {
        document.getElementById('status-bar').innerText = "1: مساعدة | 0: أذان | 5: تحديث";
    }
}

function toggleHelp() {
    isHelpOpen = !isHelpOpen;
    document.getElementById('help-modal').style.display = isHelpOpen ? 'block' : 'none';
    if (isMenuOpen && isHelpOpen) { toggleMenu(); }
}

function updateClock() {
    var d = new Date();
    var tStr = (d.getHours() < 10 ? '0' + d.getHours() : d.getHours()) + ":" + (d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes());
    document.getElementById('clock').innerText = tStr;

    if (d.getSeconds() === 0 && !alarmActive) {
        for (var k in data.times) {
            if (data.times[k] === tStr) triggerAlert('حان الآن وقت صلاة ' + k);
        }
    }
}

function triggerAlert(msg) {
    alarmActive = true;
    try { new Notification('أذان وأذكار', { body: msg }); } catch (e) { }
    if (navigator.vibrate) navigator.vibrate(5000);
    try {
        audio.currentTime = 0;
        audio.play().then(function () { setTimeout(stopAlert, 15000); }).catch(function (e) { });
    } catch (e) { }
}

function stopAlert() {
    alarmActive = false;
    try { audio.pause(); audio.currentTime = 0; } catch (e) { }
    if (navigator.vibrate) navigator.vibrate(0);
}

function fetchHadithsAPI() {
    try {
        var xhr = new XMLHttpRequest({ mozSystem: true });
        var randomPage = Math.floor(Math.random() * 10) + 1;
        var url = 'http://hadeethenc.com/api/v1/hadeeths/list/?language=ar&category_id=1&page=' + randomPage + '&per_page=15';
        xhr.open('GET', url, true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                var res = JSON.parse(xhr.responseText);
                if (res && res.data && res.data.length > 0) {
                    var newHadiths = [];
                    for (var i = 0; i < res.data.length; i++) {

                        var textStr = res.data[i].title || res.data[i].hadeeth || "حديث شريف";
                        newHadiths.push({ text: textStr, source: "موسوعة الأحاديث" });
                    }
                    hadithsList = newHadiths;
                    localStorage.setItem('saved_hadiths', JSON.stringify(hadithsList));
                }
            }
        };
        xhr.send();
    } catch (e) { }
}

function refreshData() {
    document.getElementById('status-bar').innerText = "جاري الاتصال...";
    try {
        var xhr = new XMLHttpRequest({ mozSystem: true });
        var url = 'http://api.aladhan.com/v1/timingsByCity?city=' + cities[cIdx] + '&country=Egypt&method=5&_=' + new Date().getTime();

        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var res = JSON.parse(xhr.responseText);
                        if (res.data && res.data.date) {
                            var h = res.data.date.hijri;
                            data.times = res.data.timings;
                            data.hijri = h.day + " " + h.month.ar + " " + h.year + " (" + h.month.number + ")";
                            localStorage.setItem('azan_pro_data', JSON.stringify(data));
                            updateUI();
                            document.getElementById('status-bar').innerText = "تم التحديث بنجاح";
                            fetchHadithsAPI();
                            setTimeout(function () { document.getElementById('status-bar').innerText = "1: مساعدة | 0: أذان | 5: تحديث"; }, 3000);
                        }
                    } catch (err) { }
                } else if (xhr.status === 0) {
                    document.getElementById('status-bar').innerText = "لا يوجد اتصال حقيقي";
                }
            }
        };
        xhr.send();
    } catch (e) { }
}

function showRandomHadith() {
    if (!hadithsList || hadithsList.length === 0) hadithsList = fallbackHadiths;
    var randomIndex = Math.floor(Math.random() * hadithsList.length);
    var h = hadithsList[randomIndex];

    if (!h || !h.text || h.text === "undefined") {
        h = fallbackHadiths[Math.floor(Math.random() * fallbackHadiths.length)];
        hadithsList = fallbackHadiths;
        localStorage.setItem('saved_hadiths', JSON.stringify(hadithsList));
    }

    document.getElementById('hadith-text').innerText = h.text + "\n(" + h.source + ")";
}

function updateUI() {
    document.getElementById('h-date').innerText = data.hijri;
    var list = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    for (var i = 0; i < list.length; i++) {
        var el = document.getElementById(list[i]);
        if (el) el.innerText = data.times[list[i]];
    }
}

window.addEventListener('keydown', function (e) {
    if (alarmActive) { stopAlert(); e.preventDefault(); return; }
    if (e.key === '1') { toggleHelp(); return; }

    if (isHelpOpen) {
        if (e.key === 'Backspace' || e.key === 'EndCall') { toggleHelp(); e.preventDefault(); }
        return;
    }

    if (isMenuOpen) {
        e.preventDefault();
        if (e.key === 'ArrowDown') { menuIdx = (menuIdx + 1) % cities.length; updateMenuUI(); }
        else if (e.key === 'ArrowUp') { menuIdx = (menuIdx - 1 + cities.length) % cities.length; updateMenuUI(); }
        else if (e.key === 'Enter') {
            cIdx = menuIdx;
            localStorage.setItem('saved_city_idx', cIdx);
            document.getElementById('city-box').innerText = cityAr[cIdx];
            toggleMenu();
            refreshData();
        }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Backspace' || e.key === 'EndCall') {
            if (isMenuOpen) toggleMenu();
        }
        return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { toggleMenu(); return; }
    if (e.key === '0') { triggerAlert('اختبار الأذان والاهتزاز'); return; }
    if (e.key === '2') { showRandomHadith(); return; }

    if (e.key === 'ArrowDown') focusIdx = 1;
    if (e.key === 'ArrowUp') focusIdx = 0;
    if (e.key === 'Enter') { if (focusIdx === 1) refreshData(); else toggleMenu(); }
    if (e.key === '5') refreshData();

    document.getElementById('city-box').className = (focusIdx === 0 ? 'nav-item focus' : 'nav-item');
});

buildSidebar();
setInterval(updateClock, 1000);
updateClock();
updateUI();
showRandomHadith();