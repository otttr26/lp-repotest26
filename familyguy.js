(function () {
    'use strict';

    var PLUGIN_ID     = 'family_guy_multfan';
    var BASE_URL      = 'https://family-guy.mult-fan.tv';
    var TOTAL_SEASONS = 24;
    var POSTER        = 'https://family-guy.mult-fan.tv/images/logoBig.webp';

    // Чекаємо поки Lampa повністю завантажиться
    function init() {
        // Додаємо пункт меню
        Lampa.Menu.add({
            title: '🐶 Гріффіни',
            icon:  'channel',
            id:    PLUGIN_ID,
            onSelect: function () {
                showSeasons();
            }
        });
    }

    // ---- ЕКРАН: СЕЗОНИ ----
    function showSeasons() {
        var items = [];
        for (var s = TOTAL_SEASONS; s >= 1; s--) {
            items.push({
                title:      'Сезон ' + s,
                season:     s,
                poster:     POSTER,
                background_image: POSTER,
                overview:   'Сезон ' + s + ' серіалу Гріффіни'
            });
        }

        Lampa.Activity.push({
            url:       BASE_URL,
            title:     '🐶 Гріффіни',
            component: 'category_full',
            id:        PLUGIN_ID + '_seasons',
            items:     items,
            onEnter: function (item) {
                showEpisodes(item.season);
            }
        });
    }

    // ---- ЕКРАН: СЕРІЇ ----
    function showEpisodes(seasonNum) {
        var url = BASE_URL + '/season.php?id=' + seasonNum;

        Lampa.Activity.push({
            url:       url,
            title:     'Гріффіни — Сезон ' + seasonNum,
            component: 'fg_episode_list',
            season:    seasonNum
        });
    }

    // ---- КОМПОНЕНТ СПИСКУ СЕРІЙ ----
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
                var parser   = new DOMParser();
                var doc      = parser.parseFromString(html, 'text/html');
                var links    = doc.querySelectorAll('a[href*="page.php?id="]');
                var episodes = [];

                links.forEach(function (a) {
                    var href  = a.getAttribute('href') || '';
                    var match = href.match(/page\.php\?id=(\d+)/);
                    if (!match) return;

                    var id    = match[1];
                    var epNum = parseInt(id.slice(-2), 10) || 0;
                    var text  = a.textContent.trim();
                    var lines = text.split(/\d+\s*серия\s*вышла/i);
                    var title = (lines[0] || text).trim().split('\n')[0].trim();
                    var date  = text.match(/вышла:\s*(.+)/i);

                    episodes.push({
                        id:    id,
                        ep:    epNum,
                        title: 'Е' + String(epNum).padStart(2,'0') + ' — ' + (title || 'Серія ' + epNum),
                        date:  date ? date[1].trim() : '',
                        url:   BASE_URL + '/page.php?id=' + id
                    });
                });

                if (!episodes.length) {
                    files.empty();
                    return;
                }

                episodes.forEach(function (ep) {
                    var card = Lampa.Template.get('card', {
                        title:        ep.title,
                        release_date: ep.date,
                        vote_average: '',
                        poster:       POSTER,
                        backdrop:     POSTER,
                        overview:     ep.title
                    });

                    card.on('hover:enter', function () {
                        // Відкриваємо сторінку серії
                        Lampa.Activity.push({
                            url:       ep.url,
                            title:     ep.title,
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
                up:    function () {
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
        this.destroy = function () {
            network.clear();
            files.destroy();
            scroll.destroy();
        };
    }

    // ---- КОМПОНЕНТ ПЕРЕГЛЯДУ СЕРІЇ ----
    function WatchComponent(object) {
        var html = $('<div class="fg-watch" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2em;padding:3em;box-sizing:border-box;"></div>');

        this.create = function () {
            var self = this;

            var title = $('<div style="font-size:1.6em;font-weight:bold;text-align:center;"></div>').text(object.title);
            var btn   = $('<div class="full-button selector" style="font-size:1.3em;padding:1em 3em;border-radius:0.5em;text-align:center;cursor:pointer;"></div>').text('▶ Дивитись серію');
            var note  = $('<div style="opacity:0.6;font-size:0.9em;text-align:center;"></div>').text('Відкриється у браузері на сайті mult-fan.tv');

            btn.on('hover:enter click', function () {
                if (window.AndroidJS && window.AndroidJS.openBrowser) {
                    window.AndroidJS.openBrowser(object.url);
                } else {
                    window.open(object.url, '_blank');
                }
            });

            html.append(title).append(btn).append(note);

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

    // ---- РЕЄСТРАЦІЯ ----
    Lampa.Component.add('fg_episode_list', EpisodeListComponent);
    Lampa.Component.add('fg_watch',        WatchComponent);

    // ---- СТАРТ ----
    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

    console.log('[FamilyGuy] плагін завантажено ✅');

})();
