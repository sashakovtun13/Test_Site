(function($) {
    /**
     * Очистить комментарии: localStorage.removeItem('commentsList')
     */
    var hasStorage = (function() {
        try {
            var mod = 'test';
            localStorage.setItem(mod, mod);
            localStorage.removeItem(mod);
            return true;
        } catch (exception) {
            return false;
        }
    }());

    var KEY_COMMENTS = 'commentsList';

    $.commentsWidget = function(options) {
        var comments = options.comments || [];
        var template = options.template || '';
        var form = options.form;

        comments.reverse();
        comments = comments.concat(loadUserComments());

        $.each(comments, function(index, comment) {
            addComment(comment);
        });

        form
            .on('keydown', 'textarea', function(event) {
                if (event.ctrlKey && event.keyCode == 13) {
                    // Ctrl-Enter pressed
                    event.preventDefault();
                    form.find('form').submit();
                }
            })
            .on('click', 'textarea', function() {
                form.addClass('is-active');
            })
            .on('submit', 'form', function(event) {
                event.preventDefault();

                var text = form.find('textarea').val();

                if (!text) {
                    return;
                }

                var now = new Date();
                var formatNumber = function(number) {
                    return ('00' + number).slice(-2);
                };
                var date = [
                    formatNumber(now.getDate()),
                    formatNumber(now.getMonth() + 1),
                    now.getFullYear()
                ].join('.') + ' ' + [
                    formatNumber(now.getHours()),
                    formatNumber(now.getMinutes())
                ].join(':');

                var comment = {
                    avatar: form.find('img').attr('src'),
                    author: form.find('[name=author]').val() || 'Гость',
                    text: text,
                    date: date
                };

                addComment(comment);
                saveUserComment(comment);
            })
            ;

        function addComment(comment) {
            var html = template.replace(/\{([^}]+?)\}/g, function(_, key) {
                return comment[key] || '';
            });
            options.list.prepend(html);

            options.form.find('textarea').val('');

            var commentsCount = options.list.children().length;
            options.counter.text(
                commentsCount
                + ' '
                + pluralize(
                    commentsCount,
                    'تعليقات', 'تعليقات', 'تعليقات'
                )
            );
        }
    };

    function loadUserComments() {
        if (!hasStorage) {
            return [];
        }

        var comments = localStorage.getItem(KEY_COMMENTS) || '[]';

        return JSON.parse(comments);
    }

    function saveUserComment(comment) {
        if (!hasStorage) {
            return;
        }

        var comments = loadUserComments();
        comments.push(comment);

        localStorage.setItem(KEY_COMMENTS, JSON.stringify(comments));
    }

    function pluralize(n, one, two, five) {
        if (n % 10 == 1 && n % 100 != 11) {
            return one;
        }

        if (between(n % 10, 2, 4) && !between(n % 100, 12, 14)) {
            return two;
        }

        return five;
    }

    function between(n, from, to) {
        return n >= from && n <= to;
    }
}(jQuery));