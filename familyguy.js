(function () {
    'use strict';

    // ============================================================
    //  КОНФІГ
    // ============================================================
    var PLUGIN_ID   = 'family_guy_multfan';
    var BASE_URL    = 'https://family-guy.mult-fan.tv';
    var PROXY       = 'https://cors-anywhere.herokuapp.com/'; // fallback якщо потрібен proxy
    var TOTAL_SEASONS = 24;

    // Постер та лого
    var POSTER = 'https://family-guy.mult-fan.tv/images/logoBig.webp';

    // ============================================================
    //  УТИЛІТИ
    // ============================================================
    function parseHTML(html) {
        var parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }

    function fetchPage(url, callback, errorCb) {
        Lampa.Network.silent(url, function (res) {
            callback(res);
        }, function (err) {
            if (errorCb) errorCb(err);
        });
    }

    // Красивий скролабельний список для Lampa
    function scroll(items) {
        return Lampa.InteractionMain ? items : items;
    }

    // ============================================================
    //  ПАРСЕР: список серій сезону
    // ============================================================
    function parseSeasonEpisodes(html, seasonNum) {
        var doc   = parseHTML(html);
        var links = doc.querySelectorAll('a[href*="page.php?id="]');
        var episodes = [];

        links.forEach(function (a) {
            var href  = a.getAttribute('href') || '';
            var match = href.match(/page\.php\?id=(\d+)/);
            if (!match) return;

            var id       = match[1];
            var epNum    = parseInt(id.slice(-2), 10) || 0;
            var italic   = a.querySelector('i');
            var title    = '';
            var desc     = '';
            var date     = '';

            if (italic) {
                var full = italic.textContent || '';
                // Формат: "НазваОпис N серія вышла: дата"
                var dateMatch = full.match(/(\d+)\s*серия\s*вышла:\s*(.+)/i) ||
                                full.match(/(\d+)\s*серія\s*вийшла:\s*(.+)/i);
                if (dateMatch) {
                    epNum = parseInt(dateMatch[1], 10) || epNum;
                    date  = dateMatch[2].trim();
                    var beforeDate = full.replace(dateMatch[0], '').trim();
                    // Перший рядок — назва, решта — опис
                    var lines = beforeDate.split(/\n|\r/).map(function(l){ return l.trim(); }).filter(Boolean);
                    title = lines[0] || ('Серія ' + epNum);
                    desc  = lines.slice(1).join(' ').trim();
                } else {
                    title = full.trim().split('\n')[0] || ('Серія ' + epNum);
                }
            } else {
                title = a.textContent.trim() || ('Серія ' + epNum);
            }

            episodes.push({
                id:      id,
                epNum:   epNum,
                season:  seasonNum,
                title:   'С' + seasonNum + 'Е' + String(epNum).padStart(2, '0') + ' — ' + title,
                desc:    desc,
                date:    date,
                url:     BASE_URL + '/page.php?id=' + id,
                poster:  POSTER
            });
        });

        return episodes;
    }

    // ============================================================
    //  КОМПОНЕНТ: список серій сезону
    // ============================================================
    function EpisodesComponent(object) {
        var seasonNum = object.season;
        var network   = new Lampa.Reguest();
        var scroll$1  = new Lampa.Scroll({ mask: true, over: true });
        var items$1   = new Lampa.Explorer(object);
        var active    = false;

        this.create = function () {
            var self = this;

            scroll$1.minus();
            items$1.appendFiles(scroll$1.render());

            var url = BASE_URL + '/season.php?id=' + seasonNum;

            network.silent(url, function (html) {
                var episodes = parseSeasonEpisodes(html, seasonNum);

                if (!episodes.length) {
                    items$1.empty();
                    return;
                }

                episodes.forEach(function (ep) {
                    var card = Lampa.Template.get('card', {
                        title:  ep.title,
                        release_date: ep.date ? '📅 ' + ep.date : '',
                        vote_average: '',
                        poster: ep.poster,
                        backdrop: ep.poster,
                        overview: ep.desc || 'Серія ' + ep.epNum + ' сезону ' + ep.season
                    });

                    // Клик — відкрити WebView/браузер
                    card.on('hover:enter', function () {
                        // Lampa відкриває зовнішній лінк через Activity browser
                        Lampa.Activity.push({
                            url:       ep.url,
                            title:     ep.title,
                            component: 'iframe_player',
                            season:    ep.season,
                            episode:   ep.epNum,
                            ep_data:   ep
                        });
                    });

                    card.on('hover:focus', function (elem) {
                        scroll$1.update(elem, true);
                    });

                    items$1.append(card);
                });

                self.start();
            }, function () {
                items$1.empty();
                Lampa.Noty.show('Не вдалось завантажити список серій');
            });

            return this.render();
        };

        this.start = function () {
            if (active) return;
            active = true;
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll$1.render(), items$1.render());
                    Lampa.Controller.collectionFocus(false, items$1.render());
                },
                left:  function () { Navigator.move('left'); },
                right: function () { Navigator.move('right'); },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () { Navigator.move('down'); },
                back:  this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.back = function () {
            Lampa.Activity.backward();
        };

        this.pause  = function () { active = false; };
        this.stop   = function () { active = false; };
        this.render = function () { return items$1.render(); };
        this.destroy = function () {
            network.clear();
            items$1.destroy();
            scroll$1.destroy();
        };
    }

    // ============================================================
    //  КОМПОНЕНТ: IFrame Player (відкриває сторінку серії)
    // ============================================================
    function IframePlayerComponent(object) {
        var ep   = object.ep_data;
        var html = Lampa.Template.get('about', {});

        this.create = function () {
            var self = this;
            var wrap = $('<div class="fg-player-wrap" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2em;box-sizing:border-box;"></div>');

            var info = $('<div style="font-size:1.4em;text-align:center;margin-bottom:1.5em;"></div>');
            info.html('<b>' + ep.title + '</b><br><small>' + (ep.desc || '') + '</small>');

            var btn = $('<div class="full-button selector" style="font-size:1.2em;padding:0.8em 2em;cursor:pointer;border-radius:0.5em;text-align:center;"></div>');
            btn.text('▶ Відкрити у браузері');

            btn.on('hover:enter click', function () {
                // Відкриваємо сторінку серії в зовнішньому браузері або через Lampa.Iframe
                if (Lampa.Utils && Lampa.Utils.openExternalUrl) {
                    Lampa.Utils.openExternalUrl(ep.url);
                } else {
                    window.open(ep.url, '_blank');
                }
            });

            wrap.append(info).append(btn);
            html.find('.about__title').html(ep.title);
            html.find('.about__box').empty().append(wrap);

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(btn[0], html);
                },
                up:    function () { Lampa.Controller.toggle('head'); },
                down:  function () {},
                left:  function () {},
                right: function () {},
                back:  self.back
            });
            Lampa.Controller.toggle('content');

            return this.render();
        };

        this.start   = function () {};
        this.pause   = function () {};
        this.stop    = function () {};
        this.back    = function () { Lampa.Activity.backward(); };
        this.render  = function () { return html; };
        this.destroy = function () {};
    }

    // ============================================================
    //  ГОЛОВНИЙ КОМПОНЕНТ: список сезонів
    // ============================================================
    function SeasonsComponent(object) {
        var network  = new Lampa.Reguest();
        var scroll$1 = new Lampa.Scroll({ mask: true, over: true });
        var items$1  = new Lampa.Explorer(object);
        var active   = false;

        this.create = function () {
            var self = this;
            scroll$1.minus();
            items$1.appendFiles(scroll$1.render());

            // Будуємо картки сезонів (від нового до старого)
            for (var s = TOTAL_SEASONS; s >= 1; s--) {
                (function (seasonNum) {
                    var card = Lampa.Template.get('card', {
                        title:        'Сезон ' + seasonNum,
                        release_date: seasonNum === TOTAL_SEASONS ? '🆕 Новий' : '',
                        vote_average: '',
                        poster:       POSTER,
                        backdrop:     POSTER,
                        overview:     'Сезон ' + seasonNum + ' серіалу «Гріффіни»'
                    });

                    card.on('hover:enter', function () {
                        Lampa.Activity.push({
                            title:     'Гріффіни — Сезон ' + seasonNum,
                            component: 'fg_episodes',
                            season:    seasonNum
                        });
                    });

                    card.on('hover:focus', function (elem) {
                        scroll$1.update(elem, true);
                    });

                    items$1.append(card);
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
                    Lampa.Controller.collectionSet(scroll$1.render(), items$1.render());
                    Lampa.Controller.collectionFocus(false, items$1.render());
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
        this.render  = function () { return items$1.render(); };
        this.destroy = function () {
            network.clear();
            items$1.destroy();
            scroll$1.destroy();
        };
    }

    // ============================================================
    //  РЕЄСТРАЦІЯ КОМПОНЕНТІВ
    // ============================================================
    Lampa.Component.add('fg_seasons',   SeasonsComponent);
    Lampa.Component.add('fg_episodes',  EpisodesComponent);
    Lampa.Component.add('iframe_player', IframePlayerComponent);

    // ============================================================
    //  ПУНКТ У ГОЛОВНОМУ МЕНЮ
    // ============================================================
    function addMenuEntry() {
        var exist = Lampa.Lang.translate('menu_familyguy');
        if (!exist || exist === 'menu_familyguy') {
            Lampa.Lang.add({
                menu_familyguy: { ru: '🐶 Гріффіни', uk: '🐶 Гріффіни', en: '🐶 Family Guy' }
            });
        }

        Lampa.Menu.add({
            title:     Lampa.Lang.translate('menu_familyguy'),
            icon:      'channel',      // вбудована іконка lampa
            id:        PLUGIN_ID,
            onSelect: function () {
                Lampa.Activity.push({
                    title:     '🐶 Гріффіни',
                    component: 'fg_seasons'
                });
            }
        });
    }

    // ============================================================
    //  ІНІЦІАЛІЗАЦІЯ
    // ============================================================
    if (window.appready) {
        addMenuEntry();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') addMenuEntry();
        });
    }

    console.log('[FamilyGuy Plugin] завантажено ✅');

})();
