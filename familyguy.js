(function () {
    'use strict';

    var BASE_URL = 'https://family-guy.mult-fan.tv';
    var POSTER   = 'https://family-guy.mult-fan.tv/images/logoBig.webp';
    var PROXY    = 'https://api.allorigins.win/raw?url=';

    // ============================================================
    // МЕНЮ — вставляємо в .menu__case (перша секція, не .nosort)
    // ============================================================
    function addMenu() {
        var icon = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M3 21c0-4.418 4.029-8 9-8s9 3.582 9 8" stroke="currentColor" stroke-width="1.5"/></svg>';
        var item = $([
            '<li class="menu__item selector" data-action="fg_seasons">',
            '<div class="menu__ico">' + icon + '</div>',
            '<div class="menu__text">Гріффіни</div>',
            '</li>'
        ].join(''));

        item.on('hover:enter click', function () {
            Lampa.Activity.push({
                title:     'Гріффіни',
                component: 'fg_seasons',
                url:       BASE_URL
            });
        });

        // Додаємо в першу секцію меню (динамічні пункти)
        var menuCase = $('.menu__case').not('.nosort').first();
        if (!menuCase.length) menuCase = $('.menu__list').first();
        menuCase.append(item);
    }

    // ============================================================
    // FETCH через проксі
    // ============================================================
    function fetchPage(url, success, error) {
        $.ajax({
            url:     PROXY + encodeURIComponent(url),
            timeout: 15000,
            success: success,
            error:   error || function () {}
        });
    }

    // ============================================================
    // КАРТКА
    // ============================================================
    function makeCard(title, year) {
        return Lampa.Template.get('card', {
            title:        title,
            release_year: year || '',
            vote_average: '',
            poster:       POSTER,
            backdrop:     POSTER,
            overview:     title
        });
    }

    // ============================================================
    // БАЗОВИЙ КОМПОНЕНТ з правильним Controller
    // Згідно з документацією: collectionSet отримує scroll.render(true)
    // MutationObserver сам підхоплює .selector в DOM
    // ============================================================
    function BaseGridComponent() {
        this.scroll  = new Lampa.Scroll({ mask: true, over: true });
        this.active  = false;
        this._self   = this;
    }

    BaseGridComponent.prototype.startController = function () {
        if (this.active) return;
        this.active = true;
        var self = this;
        var scrollEl = self.scroll.render(true);

        Lampa.Controller.add('content', {
            toggle: function () {
                Lampa.Controller.collectionSet(scrollEl);
                Lampa.Controller.collectionFocus(false, scrollEl);
            },
            left:  function () {
                if (Navigator.canmove('left')) Navigator.move('left');
                else Lampa.Controller.toggle('menu');
            },
            right: function () { Navigator.move('right'); },
            up:    function () {
                if (Navigator.canmove('up')) Navigator.move('up');
                else Lampa.Controller.toggle('head');
            },
            down:  function () { Navigator.move('down'); },
            back:  function () { Lampa.Activity.backward(); }
        });

        Lampa.Controller.toggle('content');
    };

    BaseGridComponent.prototype.pause   = function () { this.active = false; };
    BaseGridComponent.prototype.stop    = function () { this.active = false; };
    BaseGridComponent.prototype.back    = function () { Lampa.Activity.backward(); };
    BaseGridComponent.prototype.render  = function () { return this.scroll.render(); };
    BaseGridComponent.prototype.destroy = function () { this.scroll.destroy(); };
    BaseGridComponent.prototype.start   = function () { this.startController(); };

    // ============================================================
    // СЕЗОНИ
    // ============================================================
    function SeasonsComponent(object) {
        BaseGridComponent.call(this);
        this.object = object;
    }
    SeasonsComponent.prototype = Object.create(BaseGridComponent.prototype);
    SeasonsComponent.prototype.constructor = SeasonsComponent;

    SeasonsComponent.prototype.create = function () {
        var self = this;
        this.scroll.minus();

        // Картки додаємо прямо в scroll (в його scroll__body)
        for (var s = 24; s >= 1; s--) {
            (function (seasonNum) {
                var card = makeCard('Сезон ' + seasonNum, seasonNum === 24 ? 'Новий' : '');
                card.on('hover:enter', function () {
                    Lampa.Activity.push({
                        url:       BASE_URL + '/season.php?id=' + seasonNum,
                        title:     'Гріффіни — Сезон ' + seasonNum,
                        component: 'fg_episodes'
                    });
                });
                // scroll.append додає в scroll__body — правильний спосіб
                self.scroll.append(card);
            })(s);
        }

        // Після додавання карток — запускаємо контролер
        // requestAnimationFrame гарантує що DOM оновився перед collectionSet
        var scrollEl = this.scroll.render(true);
        requestAnimationFrame(function () {
            self.startController();
        });

        return this.render();
    };

    // ============================================================
    // СЕРІЇ
    // ============================================================
    function EpisodesComponent(object) {
        BaseGridComponent.call(this);
        this.object = object;
    }
    EpisodesComponent.prototype = Object.create(BaseGridComponent.prototype);
    EpisodesComponent.prototype.constructor = EpisodesComponent;

    EpisodesComponent.prototype.create = function () {
        var self = this;
        this.scroll.minus();

        // Показуємо лоадер
        var loader = $('<div style="padding:1.5em;opacity:0.7;font-size:1.1em;">⏳ Завантаження серій...</div>');
        this.scroll.append(loader);

        fetchPage(this.object.url, function (html) {
            // Очищаємо лоадер
            self.scroll.clear();

            var doc   = (new DOMParser()).parseFromString(html, 'text/html');
            var links = doc.querySelectorAll('a[href*="page.php?id="]');

            if (!links.length) {
                self.scroll.append($('<div style="padding:2em;opacity:0.6;">Серії не знайдено</div>'));
                requestAnimationFrame(function () { self.startController(); });
                return;
            }

            links.forEach(function (a) {
                var match = (a.getAttribute('href') || '').match(/page\.php\?id=(\d+)/);
                if (!match) return;

                var id    = match[1];
                var epNum = parseInt(id.slice(-2), 10) || 0;
                var lines = a.textContent.trim().split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
                var title = 'Е' + String(epNum).padStart(2, '0') + ' — ' + (lines[0] || 'Серія ' + epNum);

                var card = makeCard(title, '');
                card.on('hover:enter', function () {
                    Lampa.Activity.push({
                        url:       BASE_URL + '/page.php?id=' + id,
                        title:     title,
                        component: 'fg_watch'
                    });
                });
                self.scroll.append(card);
            });

            requestAnimationFrame(function () { self.startController(); });

        }, function () {
            self.scroll.clear();
            self.scroll.append($('<div style="padding:2em;opacity:0.6;">❌ Помилка завантаження. Перевір інтернет.</div>'));
            requestAnimationFrame(function () { self.startController(); });
        });

        return this.render();
    };

    // ============================================================
    // ПЕРЕГЛЯД СЕРІЇ
    // ============================================================
    function WatchComponent(object) {
        this.object = object;
        this.html   = $('<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1.5em;padding:3em;box-sizing:border-box;"></div>');
    }

    WatchComponent.prototype.create = function () {
        var self = this;

        this.html.append(
            $('<div style="font-size:1.6em;font-weight:bold;text-align:center;max-width:80%;"></div>')
                .text(this.object.title)
        );

        var btn = $('<div class="full-button selector" style="font-size:1.2em;padding:0.8em 2.5em;border-radius:0.4em;text-align:center;cursor:pointer;min-width:16em;"></div>')
            .text('▶ Відкрити у браузері');

        btn.on('hover:enter click', function () {
            window.open(self.object.url, '_blank');
        });

        this.html.append(btn);
        this.html.append(
            $('<div style="opacity:0.4;font-size:0.75em;text-align:center;word-break:break-all;max-width:90%;margin-top:0.5em;"></div>')
                .text(this.object.url)
        );

        var htmlEl = this.html[0];
        Lampa.Controller.add('content', {
            toggle: function () {
                Lampa.Controller.collectionSet(htmlEl);
                Lampa.Controller.collectionFocus(btn[0], htmlEl);
            },
            up:    function () { Lampa.Controller.toggle('head'); },
            down:  function () {},
            left:  function () {},
            right: function () {},
            back:  function () { Lampa.Activity.backward(); }
        });
        Lampa.Controller.toggle('content');

        return this.render();
    };

    WatchComponent.prototype.start   = function () {};
    WatchComponent.prototype.pause   = function () {};
    WatchComponent.prototype.stop    = function () {};
    WatchComponent.prototype.back    = function () { Lampa.Activity.backward(); };
    WatchComponent.prototype.render  = function () { return this.html; };
    WatchComponent.prototype.destroy = function () {};

    // ============================================================
    // РЕЄСТРАЦІЯ
    // ============================================================
    Lampa.Component.add('fg_seasons',  SeasonsComponent);
    Lampa.Component.add('fg_episodes', EpisodesComponent);
    Lampa.Component.add('fg_watch',    WatchComponent);

    // ============================================================
    // СТАРТ
    // ============================================================
    setTimeout(addMenu, 500);

    console.log('[FamilyGuy] плагін завантажено ✅');

})();
