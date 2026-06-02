(function () {
    'use strict';

    var BASE_URL = 'https://family-guy.mult-fan.tv';
    var POSTER   = 'https://family-guy.mult-fan.tv/images/logoBig.webp';
    var PROXY    = 'https://api.allorigins.win/raw?url=';

    // ============================================================
    // МЕНЮ
    // ============================================================
    function addMenu() {
        var icon = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M3 21c0-4.418 4.029-8 9-8s9 3.582 9 8" stroke="currentColor" stroke-width="1.5"/></svg>';
        var item = $('<li class="menu__item selector"><div class="menu__ico">' + icon + '</div><div class="menu__text">Гріффіни</div></li>');
        item.on('hover:enter click', function () {
            Lampa.Activity.push({ title: 'Гріффіни', component: 'fg_seasons', url: BASE_URL });
        });
        var target = $('.menu__case').not('.nosort').first();
        if (!target.length) target = $('.menu__list').first();
        target.append(item);
    }

    // ============================================================
    // FETCH
    // ============================================================
    function fetchPage(url, success, error) {
        $.ajax({ url: PROXY + encodeURIComponent(url), timeout: 15000, success: success, error: error || function(){} });
    }

    // ============================================================
    // КАРТКА
    // ============================================================
    function makeCard(title, year) {
        return Lampa.Template.get('card', {
            title: title, release_year: year || '',
            vote_average: '', poster: POSTER, backdrop: POSTER, overview: title
        });
    }

    // ============================================================
    // БАЗОВИЙ GRID КОМПОНЕНТ
    // ============================================================
    function GridComponent(object) {
        this.object = object;
        this.scroll = new Lampa.Scroll({ mask: true, over: true });
        this.active = false;
    }

    GridComponent.prototype.create = function () { return this.render(); };

    GridComponent.prototype.start = function () {
        if (this.active) return;
        this.active = true;
        var self    = this;
        var el      = this.scroll.render(true);

        Lampa.Controller.add('content', {
            toggle: function () {
                Lampa.Controller.collectionSet(el);
                Lampa.Controller.collectionFocus(false, el);
            },
            left:  function () { Navigator.canmove('left') ? Navigator.move('left') : Lampa.Controller.toggle('menu'); },
            right: function () { Navigator.canmove('right') ? Navigator.move('right') : false; },
            up:    function () { Navigator.canmove('up') ? Navigator.move('up') : Lampa.Controller.toggle('head'); },
            down:  function () { Navigator.canmove('down') ? Navigator.move('down') : false; },
            back:  function () { Lampa.Activity.backward(); }
        });
        Lampa.Controller.toggle('content');
    };

    GridComponent.prototype.pause   = function () { this.active = false; };
    GridComponent.prototype.stop    = function () { this.active = false; };
    GridComponent.prototype.back    = function () { Lampa.Activity.backward(); };
    GridComponent.prototype.render  = function () { return this.scroll.render(); };
    GridComponent.prototype.destroy = function () { this.scroll.destroy(); };

    // Додати картку з автоскролом при фокусі
    GridComponent.prototype.addCard = function (card, onEnter) {
        var self = this;
        card.on('hover:enter', onEnter);
        // hover:focus — скролимо до картки (як в рідному items.js рядок 53-54)
        card.on('hover:focus', function () {
            self.scroll.update(card, false);
        });
        this.scroll.append(card);
    };

    GridComponent.prototype.done = function () {
        var self = this;
        requestAnimationFrame(function () { self.start(); });
    };

    // ============================================================
    // СЕЗОНИ
    // ============================================================
    function SeasonsComponent(object) {
        GridComponent.call(this, object);
    }
    SeasonsComponent.prototype = Object.create(GridComponent.prototype);
    SeasonsComponent.prototype.constructor = SeasonsComponent;

    SeasonsComponent.prototype.create = function () {
        this.scroll.minus();
        for (var s = 24; s >= 1; s--) {
            (function (seasonNum, self) {
                var card = makeCard('Сезон ' + seasonNum, seasonNum === 24 ? 'Новий' : '');
                self.addCard(card, function () {
                    Lampa.Activity.push({
                        url:   BASE_URL + '/season.php?id=' + seasonNum,
                        title: 'Гріффіни — Сезон ' + seasonNum,
                        component: 'fg_episodes'
                    });
                });
            })(s, this);
        }
        this.done();
        return this.render();
    };

    // ============================================================
    // СЕРІЇ
    // ============================================================
    function EpisodesComponent(object) {
        GridComponent.call(this, object);
    }
    EpisodesComponent.prototype = Object.create(GridComponent.prototype);
    EpisodesComponent.prototype.constructor = EpisodesComponent;

    EpisodesComponent.prototype.create = function () {
        var self = this;
        this.scroll.minus();
        this.scroll.append($('<div style="padding:1.5em;opacity:0.7;">⏳ Завантаження...</div>'));

        fetchPage(this.object.url, function (html) {
            self.scroll.clear();
            var doc   = (new DOMParser()).parseFromString(html, 'text/html');
            var links = doc.querySelectorAll('a[href*="page.php?id="]');

            if (!links.length) {
                self.scroll.append($('<div style="padding:2em;opacity:0.6;">Серії не знайдено</div>'));
                self.done();
                return;
            }

            links.forEach(function (a) {
                var match = (a.getAttribute('href') || '').match(/page\.php\?id=(\d+)/);
                if (!match) return;
                var id    = match[1];
                var epNum = parseInt(id.slice(-2), 10) || 0;
                // Беремо назву серії з тексту посилання (перший рядок)
                var lines = a.textContent.trim().split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
                var name  = lines[0] || 'Серія ' + epNum;
                var title = 'Е' + String(epNum).padStart(2,'0') + ' — ' + name;
                var epUrl = BASE_URL + '/page.php?id=' + id;

                var card = makeCard(title, '');
                self.addCard(card, function () {
                    Lampa.Activity.push({
                        url: epUrl, title: title, component: 'fg_watch'
                    });
                });
            });

            self.done();
        }, function () {
            self.scroll.clear();
            self.scroll.append($('<div style="padding:2em;opacity:0.6;">❌ Помилка завантаження</div>'));
            self.done();
        });

        return this.render();
    };

    // ============================================================
    // ПЕРЕГЛЯД — iframe прямо в Lampa
    // ============================================================
    function WatchComponent(object) {
        this.object  = object;
        this.iframe  = null;
        this.html    = $('<div class="fg-watch" style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;"></div>');
    }

    WatchComponent.prototype.create = function () {
        var self = this;

        // Заголовок
        var header = $('<div style="padding:0.8em 1.5em;font-size:1.1em;font-weight:bold;opacity:0.9;flex-shrink:0;"></div>').text(this.object.title);

        // iframe контейнер
        var iframeWrap = $('<div style="flex:1;position:relative;background:#000;"></div>');
        var iframe = $('<iframe></iframe>').attr({
            src:             this.object.url,
            frameborder:     '0',
            allowfullscreen: 'true',
            scrolling:       'yes'
        }).css({
            width:  '100%',
            height: '100%',
            border: 'none',
            display: 'block'
        });

        // Кнопка "відкрити в браузері" як fallback
        var btnWrap = $('<div style="padding:0.8em 1.5em;flex-shrink:0;display:flex;gap:1em;"></div>');
        var btnBrowser = $('<div class="full-button selector" style="padding:0.6em 2em;border-radius:0.4em;text-align:center;cursor:pointer;font-size:1em;"></div>').text('🌐 Відкрити у браузері');
        btnBrowser.on('hover:enter click', function () { window.open(self.object.url, '_blank'); });

        btnWrap.append(btnBrowser);
        iframeWrap.append(iframe);
        this.html.append(header).append(iframeWrap).append(btnWrap);
        this.iframe = iframe;

        var htmlEl = this.html[0];
        Lampa.Controller.add('content', {
            toggle: function () {
                Lampa.Controller.collectionSet(htmlEl);
                Lampa.Controller.collectionFocus(btnBrowser[0], htmlEl);
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
    WatchComponent.prototype.stop    = function () { if (this.iframe) this.iframe.attr('src', ''); };
    WatchComponent.prototype.back    = function () { Lampa.Activity.backward(); };
    WatchComponent.prototype.render  = function () { return this.html; };
    WatchComponent.prototype.destroy = function () { if (this.iframe) this.iframe.attr('src', ''); };

    // ============================================================
    // РЕЄСТРАЦІЯ
    // ============================================================
    Lampa.Component.add('fg_seasons',  SeasonsComponent);
    Lampa.Component.add('fg_episodes', EpisodesComponent);
    Lampa.Component.add('fg_watch',    WatchComponent);

    setTimeout(addMenu, 500);

})();
