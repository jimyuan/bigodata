(function(template){
  'use strict';

  /*
    artTemplate 数值格式化方法
    添加千分位，可跟第二个参数，添加一个后缀，例如'%'
    用法： {{ value | dataFormat }} or {{ value | dataFormat:'%' }}
  */
  template.helper('dataFormat', function(data){
    var num = data.toString(), result = '';
    while (num.length > 3) {
      result = ',' + num.slice(-3) + result;
      num = num.slice(0, num.length - 3);
    }
    result = num + result;
    return arguments[1]
      ? result + arguments[1]
      : result;
  });

  /*
    artTemplate 增长率格式化方法
    绿减红增
    用法： {{ value | rateFormat }}
  */
  template.helper('rateFormat', function(data){
    var value = parseFloat(data),
        cls   = value > 0
                ? 'text-increase'
                : value < 0 ? 'text-decline' : 'pull-right';
    return '<span class="fa ' + cls + '">' + value.toFixed(2) + ' %</span>';
  });
})(template);
