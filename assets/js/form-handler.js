var url = {
    "siteinfo": "/siteinfo",
    "siteview": "/siteview",
    "regorder": "/regorder",
    "success": "/success.html"
};

//$(initLanding);

function initLanding() {
    var runFbPixelOnSuccessPage = 0;
    var viewEmailOnSuccessPage = null;

    var $forms = $('form');

    setPlaceholders($forms);

    var geo_info = doGeoInfoRequest();
    var geo_info_parsed = {};
    try {
        geo_info_parsed = JSON.parse(geo_info.responseText);
    } catch (err) {}

    if (!geo_info_parsed.fb_pixel_id && geo_info_parsed.fb_pixel_scs_id) {
        runFbPixelOnSuccessPage = 1;
    }

    var landing_id = geo_info_parsed.landing_id || null;

    var currency = getCurrency(geo_info_parsed);

    $(".adfh-currency").append(currency);
    $(".adfh-old-price").append(geo_info_parsed.old_price);
    $(".adfh-new-price").append(geo_info_parsed.new_price);
    $(".adfh-discount").append(geo_info_parsed.discount);
    $(".adfh-difference").append(geo_info_parsed.old_price - geo_info_parsed.new_price);

    (function (d, e, id) {
        var div, body = d.getElementsByTagName('body')[0];
        if (d.getElementById(id)) {
            return;
        }
        div = d.createElement(e);
        div.id = id;
        body.appendChild(div);
    }(document, 'div', 'responseContainer'));

    var cookie_adfsh_view = checkCookie('adfsh_view_hash');
    var cookie_adfsh_session = checkCookie('adfsh_session_id');

    if (!cookie_adfsh_session) {
        setCookie('adfsh_session_id', generateSID(13), 0.01);
    }

    $forms.find('input[name="offer_hash"]').val(geo_info_parsed.offer_hash);

    if (cookie_adfsh_view) {
        doViewRequest(landing_id, false);
    } else {
        setCookie('adfsh_view_hash', generateViewHash(24), 10000);
        doViewRequest(landing_id, true);
    }

    $forms.find('input[name="referrer"]').val(location);
    $forms.find('input[name="sid"]').val(getCookie('adfsh_session_id'));
    $forms.find('input[name="view_hash"]').val(getCookie('adfsh_view_hash'));

    setupInputsBehavior($forms, geo_info_parsed);

    runAuditScripts(geo_info_parsed);

    if (viewEmailOnSuccessPage === null) {
        viewEmailOnSuccessPage = geo_info_parsed.email_view;
    }

    var timeViewStart = (new Date()).getTime();

    $forms.submit(function () {
        var $form = $(this);
        var timeViewEnd = (new Date()).getTime();
        var timeView = timeViewEnd - timeViewStart;
        $form.find('input[name="view_time"]').val(millisToMinutesAndSeconds(timeView));

        var isValidForm = validateForm($form);
        if (isValidForm) {

            if (!runFbPixelOnSuccessPage) {
                /** FB Lead track */
                var fbPixelId = String(geo_info_parsed.fb_pixel_id || "");
                var fbPixelScsId = String(geo_info_parsed.fb_pixel_scs_id || "");

                if (fbPixelScsId && (fbPixelScsId === fbPixelId)) {
                    fbq("track", "Lead");
                } else if (fbPixelScsId) {
                    var fbIsAlreadyExist = runAuditScripts({fb_pixel_id: fbPixelScsId}) ? false : true;
                    fbq("init", fbPixelScsId);
                    if (fbIsAlreadyExist) {
                        fbq('trackSingle', fbPixelScsId, 'PageView');
                        fbq('trackSingle', fbPixelScsId, 'Lead');
                    } else {
                        fbq("track", "PageView");
                        fbq("track", "Lead");
                    }
                }
            }

            var formData = $form.serialize();
            $.ajax({
                type: "POST",
                url: url.regorder,
                data: formData,
                complete: function (r) {
                    var lmc_response = {};
                    try {
                        lmc_response = $.parseJSON(r);
                    } catch (err) {}

                    setCookie('adfsh_status_success', 1, 1);

                    var param = {
                        'lang': document.documentElement.lang,
                        'referrer': document.location.host.replace(/^(www\.)/, ""),
                        'pay_online_buttons': ((1 == lmc_response.pay_online) ? 1 : 0),
                        'pay_online_script': ((1 == lmc_response.pay_online) ? 1 : 0),
                        'in_blacklist': ((1 == lmc_response.in_blacklist) ? 1 : 0),
                        'email_view': parseInt(viewEmailOnSuccessPage),
                        'block_fb_pixel_script': ((0 === runFbPixelOnSuccessPage) ? 1 : 0),
                        'name': $form.find('input[name="name"]').val(),
                        'phone': $form.find('input[name="phone"]').val(),
                        'address': $form.find('textarea').val(),
                        'sid': $form.find('[name="sid"]').val()
                    };
                    doPostRequest(url.success, param, false);
                }
            });
        }

        return false;
    });
}

function getValidationRules() {
    var regexFilterSpecialChars = /[!?@#$%^&*|+=\(\)\{\}\[\]~`<>':";]/g;
    var regexFilterPhoneNumber = /[^0-9+]/g;
    var regexAllowOnlyDigits = /[^0-9]/g;

    var rules = {
        "name": {
            "attr": {
                "required": "required",
                "minlength": 2,
                "maxlength": 30
            },
            "behavior": {
                "filter": {
                    "regex": regexFilterSpecialChars
                }
            }
        },
        "phone": {
            "alias": [
                '[type="tel"]'
            ],
            "attr": {
                "required": "required",
                "minlength": 10,
                "maxlength": 14
            },
            "data": {
                "phone_behavior_custom": true
            },
            "behavior": {
                "filter": {
                    "regex": regexFilterPhoneNumber
                }
            },
            "validate": {
                "replace": {
                    "regex": /[\D]/g
                },
                "test": {
                    "regex": /_$/
                }
            }
        },
        "extradata[alternative_phone]": {
            "attr": {
                "minlength": 10,
                "maxlength": 14
            },
            "behavior": {
                "filter": {
                    "regex": regexFilterPhoneNumber
                }
            },
            "validate": {
                "replace": {
                    "regex": /[\D]/g
                }
            }
        },
        "extradata[city]": {
            "attr": {
                "required": "required",
                "maxlength": 30
            },
            "behavior": {
                "filter": {
                    "regex": regexFilterSpecialChars
                }
            }
        },
        "extradata[state]": {
            "attr": {
                "required": "required",
                "maxlength": 30
            },
            "behavior": {
                "filter": {
                    "regex": regexFilterSpecialChars
                }
            }
        },
        "extradata[postindex]": {
            "attr": {
                "required": "required",
                "minlength": 6,
                "maxlength": 6
            },
            "behavior": {
                "filter": {
                    "regex": regexAllowOnlyDigits
                }
            }
        }
    };

    return rules;
}

function validateForm($form) {
    var errorClass = 'input-error';

    var cssStyleTagClass = 'form-input-errors-highlight';
    var cssStyleSelectors = [
        'input:invalid:not(:focus):not(:placeholder-shown)',
        'input.' + errorClass
    ];
    var cssStyleError = [
        'border: 1px solid #B94A48 !important;',
        'background-color: #FFEEEE !important;'
    ];
    $.each(cssStyleSelectors, function(index){
        addStyleTag(cssStyleSelectors[index] + '{' + cssStyleError.join(' ') + '}', cssStyleTagClass + '-' + index);
    });
    /* addStyleTag(cssStyleSelectors.join(',') + '{' + cssStyleError.join(' ') + '}', cssStyleTagClass); */

    /* validation rules */

    var rules = getValidationRules();

    /* find input's */

    var $inputs = $form.find('input, textarea').filter(':visible').removeClass(errorClass);

    /* common input validation */

    $.each(rules, function(name, data){
        var aliases = '';
        if (data['alias'] && data['alias'].length) {
            aliases = ',' + data['alias'].join(',');
        }
        /* get input elements */
        var $input = $inputs.filter('input[name="' + name + '"]' + aliases);
        /* get input value */
        var value = $.trim($input.val());
        /* filter (replace) input value */
        if (data['validate'] && data['validate']['replace'] && data['validate']['replace']['regex']) {
            value = value.replace(data['validate']['replace']['regex'], '');
        }
        /* check by rules */
        var isNotValid = 0;
        if (data['attr'] && data['attr']['required']) {
            isNotValid += (!value.length) ? 1 : 0;
        }
        if (data['attr'] && data['attr']['minlength']) {
            if (value.length || data['attr']['required']) {
                isNotValid += (value.length < data['attr']['minlength']) ? 1 : 0;
            }
        }
        if (data['attr'] && data['attr']['maxlength']) {
            isNotValid += (value.length > data['attr']['maxlength']) ? 1 : 0;
        }
        if (data['validate'] && data['validate']['test'] && data['validate']['test']['regex']) {
            isNotValid += (data['validate']['test']['regex'].test($input.val())) ? 1 : 0;
        }
        /* checking result */
        if (isNotValid) {
            $input.addClass(errorClass);
        }
    });

    /* finalize */

    var isValid = ($inputs.hasClass(errorClass)) ? false : true;

    return isValid;
}

function setupInputsBehavior($forms, data) {
    var errorClass = 'input-error';

    /* common input behavior */

    $(document).on('focus click', 'form input.' + errorClass, function(){
        var $input = $(this);
        $input.removeClass(errorClass);
    });

    var rules = getValidationRules();
    if (data.phone_code) {
        /* validation will be done by the "inputmask" plugin */
        delete rules['phone'];
    }

    $.each(rules, function(name, data){
        var aliases = '';
        if (data['alias'] && data['alias'].length) {
            aliases = ',' + data['alias'].join(',');
        }
        var $input = $forms.find('input[name="' + name + '"]' + aliases);
        if (data['attr']) {
            $.each(data['attr'], function(attr, value){
                $input.attr(attr, value);
            });
        }
        if (data['data']) {
            $.each(data['data'], function(key, value){
                $input.data(key, value);
            });
        }
        if (data['behavior'] && data['behavior']['filter'] && data['behavior']['filter']['regex']) {
            $input.on('input', function(){
                var regex = data['behavior']['filter']['regex'];
                var value = $(this).val();
                var valueFixed = value.replace(regex, "");
                if (valueFixed !== value) {
                    $(this).val(valueFixed);
                }
            });
        }
    });

    /* phone input behavior */

    var phoneMask = null;
    var phoneCode = data.phone_code;
    if (phoneCode) {
        phoneCode = parseInt(phoneCode, 10)
            .toString()
            .split('')
            .map(function(val){
                return '\\' + val;
            })
            .join('');
        phoneMask = "+" + phoneCode + " 99999999[9][9][9][9]";
    }

    $(document).on('focus mouseover click', 'form input[name="phone"]', function(){
        var $input = $(this);
        var keyDataMask = '_inputmask_opts';
        var keyDataCustom = 'phone_behavior_custom';
        var isExistHandler = ($input.data(keyDataMask) || $input.data(keyDataCustom)) ? true : false;

        if (phoneMask && !isExistHandler) {
            $input.inputmask({mask: phoneMask, greedy: false});
        }
    });
}

function setPlaceholders($form) {
    var docLang = document.documentElement.lang;

    var placeholder = getPlaceholdersByIso(docLang);
    var isAlignRight = getPageTextDirectionByIso(docLang);

    var inputElements = [
        'input[name]:text',
        'input[name][type="tel"]',
        'input[name][type="number"]',
        'input[name][type="email"]',
        'input[name][type="date"]',
        'input[name][type="time"]',
        'input[name][type="datetime"]',
        'textarea[name]'
    ].join(',');
    var $formInputs = $form.find(inputElements);

    for (var plsKey in placeholder) {
        $formInputs.filter('[name="' + plsKey + '"]').attr('placeholder', placeholder[plsKey]);
    }

    if (isAlignRight) {
        $formInputs.css('text-align', 'right');
    }
}

function getCurrency(data) {
    var currency = '';
    if (data && data.currency_alias) {
        currency = data.currency_alias
    } else if (data && data.currency) {
        currency = data.currency;
    }

    return currency;
}

function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
}

function doPostRequest(url, params, inNewWindow) {
    var form = document.createElement("form");

    form.setAttribute("method", "post");
    form.setAttribute("action", url);

    if (inNewWindow) {
        form.setAttribute("target", "_blank");
    }

    for (var i in params) {
        if (params.hasOwnProperty(i)) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = i;
            input.value = params[i];
            form.appendChild(input);
        }
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

function doViewRequest(landing_id, isUnique) {
    var xhr = new XMLHttpRequest();
    // var offer_hash = document.querySelector('[name="offer_hash"]').value;
    var offer_hash = '123123';
    var params = 'referrer=' + location.href + '&unique=' + isUnique + '&offer_hash=' + offer_hash + '&landing_id=' + landing_id;

    xhr.open('POST', url.siteview, false);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(params);

    return xhr;
}

function doGeoInfoRequest() {
    var geo = getParameterByName('geo');
    var referrer =  document.location.host.replace(/^(www\.)/, "");
    var postData = {
        "referrer": referrer
    };
    if (geo) {
        postData["geo_iso"] = geo;
    }
    var geoInfo = $.ajax({
        url: url.siteinfo,
        type: 'POST',
        data: postData,
        async: false
    });

    return geoInfo;
}

function getParameterByName(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    var results = regex.exec(url);

    if (!results) {
        return null;
    }
    if (!results[2]) {
        return '';
    }

    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);

    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

function generateViewHash(len) {
    var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';

    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz, randomPoz + 1);
    }

    return randomString;
}

function generateSID(len) {
    var charSet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';

    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz, randomPoz + 1);
    }
    return randomString;
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }

    return "";
}

function checkCookie(cookie_name) {
    var user = getCookie(cookie_name);
    if (user != "") {
        return true;
    } else {
        return false;
    }
}

function addStyleTag(css, styleClass) {
    $('style' + ((styleClass) ? '.' + styleClass : ''), 'head').remove();

    var d = document;
    var tag = d.createElement('style');

    d.getElementsByTagName('head')[0].appendChild(tag);
    tag.setAttribute('type', 'text/css');
    if (styleClass) {
        tag.setAttribute('class', styleClass);
    }

    if (tag.styleSheet) {
        tag.styleSheet.cssText = css;
    } else {
        tag.appendChild(document.createTextNode(css));
    }

    return tag;
}

function getPlaceholdersByIso(isoCode) {
    var localisationData = getLocatizationByIso(isoCode);

    return localisationData.placeholder;
}

function getPageTextDirectionByIso(isoCode) {
    var localisationData = getLocatizationByIso(isoCode);

    return (localisationData.align_right) ? true : false;
}

function runAuditScripts(data) {
    var scriptsSrc = [];

    var fbPixelId = data.fb_pixel_id;
    var yandexMetricsId = data.yandex_metrics_id;
    var topMailRuCounterId = data.top_mail_ru_counter;

    var fbPixelInjectedOnPage = $('script:contains("facebook"):contains("init"):contains("fbevents.js"):contains("fbq")', 'head').length;

    var fbPixelScript = '<script type="text/javascript">!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init","' + fbPixelId + '");fbq("track","PageView");<\/script>';
    var yandexMetricsScript = '<script type="text/javascript">(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(' + yandexMetricsId + ',"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true,ecommerce:"dataLayer"});<\/script>';
    var topMailRuCounterScript = '<script type="text/javascript">var _tmr=window._tmr || (window._tmr=[]);_tmr.push({id:"' + topMailRuCounterId + '",type:"pageView",start:(new Date()).getTime()});(function(d,w,id){if(d.getElementById(id))return;var ts=d.createElement("script");ts.type="text/javascript";ts.async=true;ts.id=id;ts.src="https://top-fwz1.mail.ru/js/code.js";var f=function(){var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(ts,s);};if(w.opera=="[object Opera]"){d.addEventListener("DOMContentLoaded",f,false);}else{f();}})(document,window,"topmailru-code");<\/script>';

    if (fbPixelId && !fbPixelInjectedOnPage) {
        scriptsSrc.push(fbPixelScript);
    }
    if (yandexMetricsId) {
        scriptsSrc.push(yandexMetricsScript);
    }
    if (topMailRuCounterId) {
        scriptsSrc.push(topMailRuCounterScript);
    }

    if (scriptsSrc.length) {
        var $head = $('head');
        $.each(scriptsSrc, function(i, src){
            $head.append(src);
        });
    }

    return scriptsSrc.length;
}

function getLocatizationByIso(isoCode) {
    var defaultIso = "en";

    var localisationData = {
        ae: {
            country_iso: "AE",
            country_name: "United Arab Emirates",
            language: "arabic",
            align_right: true,
            placeholder: {
                name: "إسم",
                phone: "رقم الموبيل",
                address: "العنوان: مدينة، حي، منطقة، برج و غيرها"
            }
        },
        us: {
            country_iso: "EN",
            country_name: "USA",
            language: "english",
            placeholder: {
                name: "Your name",
                phone: "Your mobile",
                address: "Your address exmpl. Town, area, Building Name or Nr. and unit Nr.",
                "extradata[alternative_phone]": "Alternative Phone",
                "extradata[postindex]": "6 Digits Pin Code",
                "extradata[state]": "State",
                "extradata[city]": "City"
            }
        },
        ru: {
            country_iso: "RU",
            country_name: "Russian Federation",
            language: "russian",
            placeholder: {
                name: "Ваше имя",
                phone: "Ваш номер телефона",
                address: "Ваш адрес напр. Город, район, улица, номер дома"
            }
        },
        it: {
            country_iso: "IT",
            country_name: "Italy",
            language: "Italian",
            placeholder: {
                name: "Inserisci il tuo nome",
                phone: "Inserisci il tuo telefono",
                address: "Inserisci il tuo indirizzo per esempio città, regione, area, numero civico"
            }
        },
        es: {
            country_iso: "ES",
            country_name: "Spain",
            language: "spanish",
            placeholder: {
                name: "Ingresa tu nombre",
                phone: "Ingresa tu teléfono",
                address: "Ingresa tu dirección por ejemplo ciudad, distrito, calle, número de casa"
            }
        },
        am: {
            country_iso: "AM",
            country_name: "Armenia",
            language: "armenian",
            placeholder: {
                name: "Անուն",
                phone: "Հեռախոսահամարի",
                address: "Հասցե"
            }
        },
        at: {
            country_iso: "AT",
            country_name: "Austria",
            language: "austrian",
            placeholder: {
                name: "Name",
                phone: "Telefonnummer",
                address: "Adresse"
            }
        },
        az: {
            country_iso: "AZ",
            country_name: "Azerbaijan",
            language: "azerbaijani",
            placeholder: {
                name: "Ad",
                phone: "Telefon nömrəsi",
                address: "Ünvan"
            }
        },
        by: {
            country_iso: "BY",
            country_name: "Belarus",
            language: "belarusian",
            placeholder: {
                name: "Имя",
                phone: "Номер телефона",
                address: "Адрес"
            }
        },
        bg: {
            country_iso: "BG",
            country_name: "Bulgaria",
            language: "bulgarian",
            placeholder: {
                name: "Име",
                phone: "Телефонен номер",
                address: "Адрес"
            }
        },
        ca: {
            country_iso: "CA",
            country_name: "Canada",
            language: "canadian",
            placeholder: {
                name: "Name",
                phone: "Phone number",
                address: "Address"
            }
        },
        hr: {
            country_iso: "HR",
            country_name: "Croatia",
            language: "croatian",
            placeholder: {
                name: "Ime",
                phone: "Broj telefona",
                address: "Adresa"
            }
        },
        cy: {
            country_iso: "CY",
            country_name: "Cyprus",
            language: "cyprus",
            placeholder: {
                name: "Όνομα",
                phone: "Τηλεφωνικό νούμερο",
                address: "Διεύθυνση"
            }
        },
        cz: {
            country_iso: "CZ",
            country_name: "Czech Republic",
            language: "czech",
            placeholder: {
                name: "Jméno",
                phone: "Telefonní číslo",
                address: "Adresa"
            }
        },
        ee: {
            country_iso: "EE",
            country_name: "Estonia",
            language: "estonian",
            placeholder: {
                name: "Nimi",
                phone: "Telefoninumber",
                address: "Aadress"
            }
        },
        fr: {
            country_iso: "FR",
            country_name: "France",
            language: "french",
            placeholder: {
                name: "Nom",
                phone: "Numéro de téléphone",
                address: "Adresse"
            }
        },
        ge: {
            country_iso: "GE",
            country_name: "Georgia",
            language: "georgian",
            placeholder: {
                name: "სახელი",
                phone: "ტელეფონის ნომერი",
                address: "მისამართი"
            }
        },
        de: {
            country_iso: "DE",
            country_name: "Germany",
            language: "german",
            placeholder: {
                name: "Name",
                phone: "Telefonnummer",
                address: "Adresse"
            }
        },
        gr: {
            country_iso: "GR",
            country_name: "Greece",
            language: "greek",
            placeholder: {
                name: "Όνομα",
                phone: "Τηλεφωνικό νούμερο",
                address: "Διεύθυνση"
            }
        },
        hu: {
            country_iso: "HU",
            country_name: "Hungary",
            language: "hungarian",
            placeholder: {
                name: "Név",
                phone: "Telefonszám",
                address: "Cím"
            }
        },
        id: {
            country_iso: "ID",
            country_name: "Indonesia",
            language: "indonesian",
            placeholder: {
                name: "Nama",
                phone: "Nomor telepon",
                address: "Alamat"
            }
        },
        kz: {
            country_iso: "KZ",
            country_name: "Kazakhstan",
            language: "kazakh",
            placeholder: {
                name: "Ат",
                phone: "Телефон нөмірі",
                address: "Мекен-жай"
            }
        },
        kg: {
            country_iso: "KG",
            country_name: "Kyrgyzstan",
            language: "kyrgyz",
            placeholder: {
                name: "Ысым",
                phone: "Тел номер",
                address: "Дарек"
            }
        },
        lv: {
            country_iso: "LV",
            country_name: "Latvia",
            language: "latvian",
            placeholder: {
                name: "Nosaukums",
                phone: "Telefona numurs",
                address: "Adrese"
            }
        },
        lb: {
            country_iso: "LB",
            country_name: "Lebanon",
            language: "lebanese",
            align_right: true,
            placeholder: {
                name: "إسم",
                phone: "رقم تليفون",
                address: "عنوان"
            }
        },
        lt: {
            country_iso: "LT",
            country_name: "Lithuania",
            language: "lithuanian",
            placeholder: {
                name: "Vardas",
                phone: "Telefono numeris",
                address: "Adresas"
            }
        },
        my: {
            country_iso: "MY",
            country_name: "Malaysia",
            language: "malaysian",
            placeholder: {
                name: "Nama",
                phone: "Nomor telepon",
                address: "Alamat"
            }
        },
        mx: {
            country_iso: "MX",
            country_name: "Mexico",
            language: "mexican",
            placeholder: {
                name: "Nombre",
                phone: "Número de teléfono",
                address: "Dirección"
            }
        },
        ma: {
            country_iso: "MA",
            country_name: "Morocco",
            language: "moroccan",
            align_right: true,
            placeholder: {
                name: "إسم",
                phone: "رقم تليفون",
                address: "عنوان"
            }
        },
        ph: {
            country_iso: "PH",
            country_name: "Philippines",
            language: "philippine",
            placeholder: {
                name: "Pangalan",
                phone: "Numero ng telepono",
                address: "Tirahan"
            }
        },
        pl: {
            country_iso: "PL",
            country_name: "Poland",
            language: "polish",
            placeholder: {
                name: "Imię",
                phone: "Numer telefonu",
                address: "Adres"
            }
        },
        pt: {
            country_iso: "PT",
            country_name: "Portugal",
            language: "portuguese",
            placeholder: {
                name: "Nome",
                phone: "Número de telefone",
                address: "Endereço"
            }
        },
        ro: {
            country_iso: "RO",
            country_name: "Romania",
            language: "romanian",
            placeholder: {
                name: "Nume",
                phone: "Numar de telefon",
                address: "Adresa"
            }
        },
        rs: {
            country_iso: "RS",
            country_name: "Serbia",
            language: "serbian",
            placeholder: {
                name: "Име",
                phone: "Број телефона",
                address: "Адреса"
            }
        },
        sk: {
            country_iso: "SK",
            country_name: "Slovakia",
            language: "slovak",
            placeholder: {
                name: "Meno",
                phone: "Telefónne číslo",
                address: "Adresa"
            }
        },
        si: {
            country_iso: "SI",
            country_name: "Slovenia",
            language: "slovenian",
            placeholder: {
                name: "Ime",
                phone: "Telefonska številka",
                address: "Naslov"
            }
        },
        za: {
            country_iso: "ZA",
            country_name: "South Africa",
            language: "south african",
            placeholder: {
                name: "Name",
                phone: "Phone number",
                address: "Address"
            }
        },
        tw: {
            country_iso: "TW",
            country_name: "Taiwan",
            language: "taiwanese",
            placeholder: {
                name: "名字",
                phone: "電話號碼",
                address: "地址"
            }
        },
        th: {
            country_iso: "TH",
            country_name: "Thailand",
            language: "thai",
            placeholder: {
                name: "ชื่อ",
                phone: "หมายเลขโทรศัพท์",
                address: "ที่อยู่"
            }
        },
        tr: {
            country_iso: "TR",
            country_name: "Turkey",
            language: "turkish",
            placeholder: {
                name: "Ad",
                phone: "Telefon numarası",
                address: "Adres"
            }
        },
        uz: {
            country_iso: "UZ",
            country_name: "Uzbekistan",
            language: "uzbek",
            placeholder: {
                name: "Nom",
                phone: "Telefon raqami",
                address: "Manzil"
            }
        },
        vn: {
            country_iso: "VN",
            country_name: "Vietnam",
            language: "vietnamese",
            placeholder: {
                name: "Tên",
                phone: "Số điện thoại",
                address: "Địa chỉ"
            }
        }
    };

    localisationData.ar = localisationData.ae;
    localisationData.en = localisationData.us;

    var localisationItem = {};

    if (isoCode && (isoCode in localisationData)) {
        localisationItem = localisationData[isoCode];

        /* merge placeholder's */
        if (defaultIso !== isoCode) {
            for (var keyName in localisationData[defaultIso].placeholder) {
                if (!localisationItem.placeholder[keyName]) {
                    localisationItem.placeholder[keyName] = localisationData[defaultIso].placeholder[keyName];
                }
            }
        }
    } else {
        localisationItem = localisationData[defaultIso];
    }

    return localisationItem;
}
