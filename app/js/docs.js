(function(){
  'use strict';

  function MBS() {

  }
  var suggestOptions = {
    allowFreeEntries: false,
    maxEntryLength: null,
    maxSelection: 10,
    toggleOnClick: true,
    useTabKey: true,
    useCommaKey: true,
    useZebraStyle: true,
    placeholder: '点击选取或输入关键词',
    noSuggestionText: '<i class="text-warning fa fa-exclamation-triangle"></i>'
  }
  $('#storeFront, #baseTarget, #compareEvent').magicSuggest($.extend(suggestOptions, {
    data: ['Lorem ipsum dolor sit amet.','Voluptates impedit veniam aspernatur doloribus.','Voluptatem repellat eaque ad tempora!','Sit qui mollitia esse maxime.','Ea, unde, minima. Officiis, minus.','Perferendis incidunt harum saepe nihil.','Earum aut aliquid at vitae.','Officiis ipsa error fugit ea.','Enim consequatur, rerum laudantium incidunt.','Deleniti tempora a veritatis. Culpa.']
  }));

  $('#indexTable').on('click', 'thead input', function(e){
    var i = $(this).attr('id').split('-')[1] - 0 + 1;
    $('#indexTable td:nth-child(' + i + ')').toggleClass('active');
  })
})();
