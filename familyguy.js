(function () {
    // Тест 1: чи виконується плагін взагалі
    console.log('[FG] плагін запустився');

    setTimeout(function () {
        // Тест 2: чи є Lampa
        console.log('[FG] Lampa =', typeof Lampa);
        console.log('[FG] Lampa.Menu =', typeof Lampa.Menu);
        console.log('[FG] Lampa.Menu.addButton =', typeof Lampa.Menu.addButton);
        console.log('[FG] $ =', typeof $);
        console.log('[FG] .menu__list count =', $('.menu__list').length);
        console.log('[FG] .menu__item count =', $('.menu__item').length);

        // Тест 3: спробуємо вставити кнопку
        try {
            var item = $('<li class="menu__item selector"><div class="menu__ico">🐶</div><div class="menu__text">Гріффіни TEST</div></li>');
            item.on('hover:enter click', function () {
                Lampa.Noty.show('Гріффіни плагін працює!');
            });
            $('.menu__list').first().append(item);
            console.log('[FG] кнопку додано успішно');
        } catch(e) {
            console.log('[FG] помилка:', e.message);
        }
    }, 3000);

})();
