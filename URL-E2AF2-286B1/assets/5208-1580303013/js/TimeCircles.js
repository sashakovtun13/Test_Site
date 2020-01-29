(function() {
  var _id = "6cc94deb8168d75418be5ef86d3dcf63";
  while (document.getElementById("timer" + _id)) _id = _id + "0";
  document.write(
    "<div id='timer" + _id + "' style='min-width:283px;height:72px;'></div>"
  );
  var _t = document.createElement("script");
  _t.src = "http://megatimer.ru/timer/timer.min.js";
  var _f = function(_k) {
    var l = new MegaTimer(_id, {
      view: [0, 1, 1, 1],
      type: {
        currentType: "3",
        params: {
          weekdays: [1, 1, 1, 1, 1, 1, 1],
          usertime: true,
          time: "00:00",
          tz: -180,
          hours: "24",
          minutes: "0"
        }
      },
      design: {
        type: "text",
        params: {
          "number-font-family": {
            family: "Comfortaa",
            link:
              "<link href='http://fonts.googleapis.com/css?family=Comfortaa&subset=latin,cyrillic' rel='stylesheet' type='text/css'>"
          },
          "number-font-size": "60",
          "number-font-color": "#000",
          "separator-margin": "20",
          "separator-on": true,
          "separator-text": ":",
          "text-on": false,
          "text-font-family": {
            family: "Comfortaa",
            link:
              "<link href='http://fonts.googleapis.com/css?family=Comfortaa&subset=latin,cyrillic' rel='stylesheet' type='text/css'>"
          },
          "text-font-size": "12",
          "text-font-color": "#c7c7c7"
        }
      },
      designId: 1,
      theme: "white",
      width: 283,
      height: 72
    });
    if (_k != null) l.run();
  };
  _t.onload = _f;
  _t.onreadystatechange = function() {
    if (_t.readyState == "loaded") _f(1);
  };
  var _h = document.head || document.getElementsByTagName("head")[0];
  _h.appendChild(_t);
}.call(this));
