(function () {
    'use strict';

    var BASE_URL      = 'https://family-guy.mult-fan.tv';
    var TOTAL_SEASONS = 24;
    var POSTER        = 'https://family-guy.mult-fan.tv/images/logoBig.webp';

    // ---- КОМПОНЕНТ: СПИСОК СЕРІЙ ----
    function EpisodeListComponent(object) {
        var network = new Lampa.Reguest();
        var scroll  = new Lampa.Scroll({ mask: true, over: true });
        var files   = new Lampa.Explorer(object);
        var active  = false;

        this.create = function () {
            var self = this;
            scroll.minus();
            files.appendFiles(scroll.render());

            network.silent(object.url, function (html) {
                var parser = new DOMParser();
                var doc    = parser.parseFromString(html, 'text/html');
                var links  = doc.querySelectorAll('a[href*="page.php?id="]');

                if (!links.length) { files.empty(); return; }

                links.forEach(function (a) {
                    var href  = a.getAttribute('href') || '';
                    var match = href.match(/page\.php\?id=(\d+)/);
                    if (!match) return;

                    var id    = match[1];
                    var epNum = parseInt(id.slice(-2), 10) || 0;
                    var text  = a.textContent.trim();
                    var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
                    var title = 'Е' + String(epNum).padStart(2,'0') + ' — ' + (lines[0] || 'Серія ' + epNum);

                    var card = Lampa.Template.get('card', {
                        title:        title,
                        release_date: '',
                        vote_average: '',
                        poster:       POSTER,
                        backdrop:     POSTER,
                        overview:     title
                    });

                    card.on('hover:enter', function () {
                        Lampa.Activity.push({
                            url:       BASE_URL + '/page.php?id=' + id,
                            title:     title,
                            component: 'fg_watch'
                        });
                    });

                    card.on('hover:focus', function (elem) {
                        scroll.update(elem, true);
                    });

                    files.append(card);
                });

                self.start();
            }, function () {
                files.empty();
                Lampa.Noty.show('Помилка завантаження серій');
            });

            return this.render();
        };

        this.start = function () {
            if (active) return;
            active = true;
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(false, files.render());
                },
                left:  function () { Navigator.move('left'); },
                right: function () { Navigator.move('right'); },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down:  function () { Navigator.move('down'); },
                back:  this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.back    = function () { Lampa.Activity.backward(); };
        this.pause   = function () { active = false; };
        this.stop    = function () { active = false; };
        this.render  = function () { return files.render(); };
        this.destroy = function () { network.clear(); files.destroy(); scroll.destroy(); };
    }

    // ---- КОМПОНЕНТ: ПЕРЕГЛЯД СЕРІЇ ----
    function WatchComponent(object) {
        var html = $('<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1.5em;padding:3em;box-sizing:border-box;"></div>');

        this.create = function () {
            var self = this;
            var title = $('<div style="font-size:1.5em;font-weight:bold;text-align:center;"></div>').text(object.title);
            var btn   = $('<div class="full-button selector" style="font-size:1.2em;padding:0.8em 2.5em;border-radius:0.4em;text-align:center;cursor:pointer;"></div>').text('▶ Відкрити серію у браузері');
            var note  = $('<div style="opacity:0.5;font-size:0.85em;text-align:center;"></div>').text(object.url);

            btn.on('hover:enter click', function () {
                if (window.AndroidJS) window.open(object.url, '_system');
                else window.open(object.url, '_blank');
            });

            html.append(title).append(btn).append(note);

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(btn[0], html);
                },
                up:    function () { Lampa.Controller.toggle('head'); },
                down:  function () {}, left: function () {}, right: function () {},
                back:  self.back
            });
            Lampa.Controller.toggle('content');
            return this.render();
        };

        this.start = function () {}; this.pause = function () {}; this.stop = function () {};
        this.back    = function () { Lampa.Activity.backward(); };
        this.render  = function () { return html; };
        this.destroy = function () {};
    }

    // ---- КОМПОНЕНТ: СПИСОК СЕЗОНІВ ----
    function SeasonsComponent(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var files  = new Lampa.Explorer(object);
        var active = false;

        this.create = function () {
            var self = this;
            scroll.minus();
            files.appendFiles(scroll.render());

            for (var s = TOTAL_SEASONS; s >= 1; s--) {
                (function (seasonNum) {
                    var card = Lampa.Template.get('card', {
                        title:        'Сезон ' + seasonNum,
                        release_date: seasonNum === TOTAL_SEASONS ? 'Новий' : '',
                        vote_average: '',
                        poster:       POSTER,
                        backdrop:     POSTER,
                        overview:     'Сезон ' + seasonNum + ' — Гріффіни'
                    });

                    card.on('hover:enter', function () {
                        Lampa.Activity.push({
                            url:       BASE_URL + '/season.php?id=' + seasonNum,
                            title:     'Гріффіни — Сезон ' + seasonNum,
                            component: 'fg_episodes'
                        });
                    });

                    card.on('hover:focus', function (elem) {
                        scroll.update(elem, true);
                    });

                    files.append(card);
                })(s);
            }

            self.start();
            return this.render();
        };

        this.start = function () {
            if (active) return;
            active = true;
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(false, files.render());
                },
                left:  function () { Navigator.move('left'); },
                right: function () { Navigator.move('right'); },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down:  function () { Navigator.move('down'); },
                back:  this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.back    = function () { Lampa.Activity.backward(); };
        this.pause   = function () { active = false; };
        this.stop    = function () { active = false; };
        this.render  = function () { return files.render(); };
        this.destroy = function () { files.destroy(); scroll.destroy(); };
    }

    // ---- РЕЄСТРАЦІЯ КОМПОНЕНТІВ ----
    Lampa.Component.add('fg_seasons',  SeasonsComponent);
    Lampa.Component.add('fg_episodes', EpisodeListComponent);
    Lampa.Component.add('fg_watch',    WatchComponent);

    // ---- ДОДАЄМО КНОПКУ В МЕНЮ ----
    function addMenu() {
        Lampa.Lang.add({
            fg_menu_title: {
                ru: 'Гріффіни',
                uk: 'Гріффіни',
                en: 'Family Guy'
            }
        });

        Lampa.Menu.addButton({
            id:    'family_guy',
            name:  'fg_menu_title',
            icon:  '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M3 21c0-4.418 4.029-8 9-8s9 3.582 9 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
            action: function () {
                Lampa.Activity.push({
                    title:     'Гріффіни',
                    component: 'fg_seasons',
                    url:       BASE_URL
                });
            }
        });
    }

    // ---- СТАРТ ----
    if (window.appready) {
        addMenu();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') addMenu();
        });
    }

})();
