(function () {
    'use strict';

    var BASE_URL = 'https://family-guy.mult-fan.tv';
    var POSTER   = 'https://family-guy.mult-fan.tv/images/logoBig.webp';

    function addMenu() {
        var icon = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M3 21c0-4.418 4.029-8 9-8s9 3.582 9 8" stroke="currentColor" stroke-width="1.5"/></svg>';
        var item = $('<li class="menu__item selector"><div class="menu__ico">' + icon + '</div><div class="menu__text">Гріффіни</div></li>');
        item.on('hover:enter click', function () {
            Lampa.Activity.push({ title: 'Гріффіни', component: 'fg_seasons', url: BASE_URL });
        });
        $('.menu__list').first().append(item);
    }

    function SeasonsComponent(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var active = false;

        this.create = function () {
            var self = this;
            scroll.minus();

            for (var s = 24; s >= 1; s--) {
                (function (seasonNum) {
                    var card = Lampa.Template.get('card', {
                        title: 'Сезон ' + seasonNum,
                        release_date: seasonNum === 24 ? 'Новий' : '',
                        vote_average: '', poster: POSTER, backdrop: POSTER,
                        overview: 'Сезон ' + seasonNum
                    });
                    card.on('hover:enter', function () {
                        Lampa.Activity.push({
                            url: BASE_URL + '/season.php?id=' + seasonNum,
                            title: 'Гріффіни — Сезон ' + seasonNum,
                            component: 'fg_episodes'
                        });
                    });
                    scroll.append(card);
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
                    Lampa.Controller.collectionSet(scroll.render(), scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                left:  function () { Navigator.move('left'); },
                right: function () { Navigator.move('right'); },
                up:    function () { Navigator.canmove('up') ? Navigator.move('up') : Lampa.Controller.toggle('head'); },
                down:  function () { Navigator.move('down'); },
                back:  this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.back    = function () { Lampa.Activity.backward(); };
        this.pause   = function () { active = false; };
        this.stop    = function () { active = false; };
        this.render  = function () { return scroll.render(); };
        this.destroy = function () { scroll.destroy(); };
    }

    function EpisodesComponent(object) {
        var network = new Lampa.Reguest();
        var scroll  = new Lampa.Scroll({ mask: true, over: true });
        var active  = false;

        this.create = function () {
            var self = this;
            scroll.minus();

            network.silent(object.url, function (html) {
                var doc   = (new DOMParser()).parseFromString(html, 'text/html');
                var links = doc.querySelectorAll('a[href*="page.php?id="]');

                if (!links.length) {
                    scroll.append($('<div style="padding:2em;opacity:0.6;">Серії не знайдено</div>'));
                    self.start();
                    return;
                }

                links.forEach(function (a) {
                    var match = (a.getAttribute('href') || '').match(/page\.php\?id=(\d+)/);
                    if (!match) return;
                    var id    = match[1];
                    var epNum = parseInt(id.slice(-2), 10) || 0;
                    var title = 'Е' + String(epNum).padStart(2, '0') + ' — '
                                + (a.textContent.trim().split('\n')[0].trim() || 'Серія ' + epNum);

                    var card = Lampa.Template.get('card', {
                        title: title, release_date: '', vote_average: '',
                        poster: POSTER, backdrop: POSTER, overview: title
                    });
                    card.on('hover:enter', function () {
                        Lampa.Activity.push({
                            url: BASE_URL + '/page.php?id=' + id,
                            title: title,
                            component: 'fg_watch'
                        });
                    });
                    scroll.append(card);
                });

                self.start();
            }, function () {
                scroll.append($('<div style="padding:2em;opacity:0.6;">Помилка завантаження</div>'));
                self.start();
            });

            return this.render();
        };

        this.start = function () {
            if (active) return;
            active = true;
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render(), scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                left:  function () { Navigator.move('left'); },
                right: function () { Navigator.move('right'); },
                up:    function () { Navigator.canmove('up') ? Navigator.move('up') : Lampa.Controller.toggle('head'); },
                down:  function () { Navigator.move('down'); },
                back:  this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.back    = function () { Lampa.Activity.backward(); };
        this.pause   = function () { active = false; };
        this.stop    = function () { active = false; };
        this.render  = function () { return scroll.render(); };
        this.destroy = function () { network.clear(); scroll.destroy(); };
    }

    function WatchComponent(object) {
        var html = $('<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1.5em;padding:3em;box-sizing:border-box;"></div>');

        this.create = function () {
            var self = this;
            html.append($('<div style="font-size:1.5em;font-weight:bold;text-align:center;"></div>').text(object.title));
            var btn = $('<div class="full-button selector" style="font-size:1.2em;padding:0.8em 2.5em;border-radius:0.4em;text-align:center;cursor:pointer;"></div>').text('▶ Відкрити у браузері');
            btn.on('hover:enter click', function () { window.open(object.url, '_blank'); });
            html.append(btn);
            html.append($('<div style="opacity:0.5;font-size:0.8em;text-align:center;word-break:break-all;margin-top:1em;"></div>').text(object.url));

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(btn[0], html);
                },
                up: function () { Lampa.Controller.toggle('head'); },
                down: function () {}, left: function () {}, right: function () {},
                back: self.back
            });
            Lampa.Controller.toggle('content');
            return this.render();
        };

        this.start = function () {}; this.pause = function () {}; this.stop = function () {};
        this.back    = function () { Lampa.Activity.backward(); };
        this.render  = function () { return html; };
        this.destroy = function () {};
    }

    Lampa.Component.add('fg_seasons',  SeasonsComponent);
    Lampa.Component.add('fg_episodes', EpisodesComponent);
    Lampa.Component.add('fg_watch',    WatchComponent);

    setTimeout(addMenu, 500);

})();
