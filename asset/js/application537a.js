    Number.prototype.formatPercent = function(options) {
      var sign, valStr, value;
      value = parseFloat(this);
      if (value) {
        sign = "";
        if (value < 0) {
          sign = "-";
        }
        valStr = (Math.abs(value) * 100).toFixed(2);
        return sign + valStr + "%";
      } else {
        return "N/A";
      }
    };

    Number.prototype.MoneyFormatAbbreviate = {
      shorten: true
    };

    Number.prototype.formatMoney = function(options) {
      var BILLION, HUNDRED_THOUSAND, MILLION, THOUSAND, currency_char, decimal_char, decimal_places, drop_insignificant, isNegative, negative_by_parenthesis, postFix, separator_char, shorten, show_plus, valStr, value;
      shorten = (options != null ? options.shorten : void 0) || false;
      decimal_places = (options != null ? options.decimal_places : void 0) || 2;
      decimal_char = (options != null ? options.decimal_char : void 0) || '.';
      separator_char = (options != null ? options.separator_char : void 0) || ',';
      currency_char = (options != null ? options.currency_char : void 0) != null ? options != null ? options.currency_char : void 0 : '$';
      negative_by_parenthesis = (options != null ? options.negative_by_parenthesis : void 0) != null ? options != null ? options.negative_by_parenthesis : void 0 : true;
      show_plus = (options != null ? options.show_plus : void 0) || false;
      drop_insignificant = (options != null ? options.drop_insignificant : void 0) || false;
      BILLION = 1000000000;
      MILLION = 1000000;
      HUNDRED_THOUSAND = 100000;
      THOUSAND = 1000;
      value = parseFloat(this);
      isNegative = value < 0;
      value = Math.abs(value);
      postFix = "";
      if (shorten) {
        /*
        if value >= BILLION # billion
            value = value / BILLION
            postFix = "B"
        else if value >= MILLION
            value = value / MILLION
            postFix = "M"
        #note we only do 'k' if we are over 100 thousand
        else if value >= HUNDRED_THOUSAND
            value = value / THOUSAND
            postFix = "K"
        else if value >= THOUSAND
            decimal_places = 0 #override this
        */

        if (value >= MILLION) {
          value = value / THOUSAND;
          postFix = "K";
          decimal_places = 0;
        }
      }
      valStr = value.toFixed(decimal_places);
      valStr = valStr.replace('.', decimal_char);
      while (/(\d+)(\d{3})/.test(valStr)) {
        valStr = valStr.toString().replace(/(\d+)(\d{3})/, '$1' + separator_char + '$2');
      }
      if (drop_insignificant && valStr.charAt(0) === "0") {
        valStr = valStr.substring(1);
      }
      valStr = currency_char + valStr + postFix;
      if (isNegative) {
        if (negative_by_parenthesis) {
          return "(" + valStr + ")";
        } else {
          return "-" + valStr;
        }
      } else {
        if (show_plus) {
          return "+" + valStr;
        } else {
          return valStr;
        }
      }
    };