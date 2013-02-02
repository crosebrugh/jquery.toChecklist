/*  (Scott's original comment) */
/**
 * toChecklist plugin (works with jQuery 1.3.x and 1.4.x)
 * @author Scott Horlbeck <me@scotthorlbeck.com>
 * @url http://www.scotthorlbeck.com/code/tochecklist/
 * @version 1.4.3
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details (LICENSE.txt or
 * http://www.gnu.org/copyleft/gpl.html)
 *
 * Thanks to the UNM Health Sciences Library and Informatics Center
 * (http://hsc.unm.edu/library/) for funding the initial creation
 * of this plugin and allowing me to publish it as open source software.
 */

/* tlatim */
/**
 * toChecklist plugin (works with jQuery 1.7+) with extensions to 
 *  filter and select/unselect filtered items as well as undo.
 *  buttons are builtin.
 *  Also overrides iOS native multiselect.
 * @author https://github.com/tlatim
 * @url https://github.com/tlatim/jquery.toChecklist
 * @url http://tlatim.github.com/jquery.toChecklist/index.html
 *
 * Same conditions as Scott's (above)
*/

(function($) {

  jQuery.fn.toChecklist = function(o) { // "o" stands for options

    // If o is a simple string, then we're updating an existing checklist
    // (e.g. 'checkAll') instead of converting a regular multi-SELECT box.
    if (typeof o == 'string') {
      this.each(function() {
        if ($(this).isChecklist()) {
          // make sure we're passing the div enclosing the list
          updateChecklist(o,$(this).find('div.checklist'));
          return false;
        }
      });

      return $;
    }

    // Provide default settings, which may be overridden if necessary.
    o = jQuery.extend({
      "addScrollBar" : true,
      "addSearchBox" : false,
      "searchBoxText" : 'Filter list...',

      // in case of name conflicts, you can change the class names to whatever you want to use.
      "cssChecklist" : 'checklist',
      "cssEven" : 'even',
      "cssOdd" : 'odd',
      "cssChecked" : 'checked',
      "cssDisabled" : 'disabled',
      "cssFocused" : 'focused', // This cssFocused is for the li's in the checklist
      "cssFindInList" : 'findInList',
      "cssBlurred" : 'blurred' // This cssBlurred is for the findInList divs.
    }, o);

    var nextId=1;

    function error(msg) {
      alert("Error toChecklist\n" + msg);
    }
    
    var overflowProperty=(o.addScrollBar)? 'overflow-y: auto; overflow-x: hidden;' : '';

    // Here, THIS refers to the jQuery stack object that contains all the target elements that
    // are going to be converted to checklists. Let's loop over them and do the conversion.
    this.each(function() {
      var numOfCheckedBoxesSoFar=0;

      // Hang on to the important information about this <select> element.
      var jSelectElem=$(this);
      var jSelectElemId=jSelectElem.attr('id');
      var jSelectElemName=jSelectElem.attr('name');

      if (!jSelectElemId) {
        jSelectElemId = 'jq_cs_' + nextId++;
      }

      if (!jSelectElemName) {
        error("Can't convert element to checklist.\nExpecting SELECT element with \"name\" attribute.");
        return $;
      }

      var height = jSelectElem.outerHeight(); /* : '100%'; */
      var width = jSelectElem.outerWidth();
      // We have to account for the extra thick left border.
      width += 25;

      // Make sure it's a SELECT element, and that it's a multiple one.
      if (this.type != 'select-multiple' && this.type != 'select-one') {
        error("Can't convert element to checklist.\nExpecting SELECT element with \"multiple\" attribute.");
        return $;
      }
      else if (this.type == 'select-one') {
        return $;
      }
      
      // loop through all options and convert them to li
      // with checkboxes and labels.        
      $('option',jSelectElem).each(function() {
        var checkboxValue=$(this).attr('value');
        // The option tag may not have had a "value" attribute set. In this case,
        // Firefox automatically uses the innerHTML instead, but we need to set it
        // manually for IE.
        if (checkboxValue === '') {
          checkboxValue = $(this).html();
        }

        checkboxValue = checkboxValue.replace(/ /g,'_');
        
        var checkboxId = jSelectElemId+'_'+checkboxValue;
        // escape bad values for checkboxId
        //          checkboxId = checkboxId.replace(/(\.|\/|\,|\%|\<|\>)/g, '\\$1');
        //var regexp = new RegExp('(\.|\/|,|%|<|>)',"g");
        checkboxId = checkboxId.replace(/[^a-zA-Z0-9_]/g, '_');
        
        var labelText = $(this).html();
        var selected = '';
        var disabled = '';
        var disabledClass = '';
        var resetValue = '';
        var dataValue=$(this).data('value') || labelText;

        if ($(this).attr('disabled')) {
          disabled = ' disabled="disabled"';
          disabledClass = ' class="disabled"';
        }
        else {
          if ($(this).attr('selected')) {
            resetValue = 'checked';
            selected += 'checked="checked"';
          }
        }
        
        $(this).replaceWith('<li><input type="checkbox" value="'+checkboxValue +
                            '" data-reset="' + resetValue +
                            '" name="'+ jSelectElemName + 
                            '" id="'+checkboxId+'" ' + selected + disabled +
                            ' data-value="' + dataValue + '"' + 
                            '/><span'+disabledClass+'>'+labelText+'</span></li>');
      });

      var checklistId=jSelectElemId + '_checklist';
      var checklistTableId=jSelectElemId + '_checklist_table';

      // Convert the <select> to a <table> holding buttons on the left and the list on the right
      // The list is enclosed inside another div that has the original id, so developers
      // can access it as before. This allows the search box to be inside the div as well.
      // also add a hidden input field with the same name as the <select>

      var div='<div id="'+jSelectElemId+'">' +
        '<div id="'+checklistId+'" data-tableid="' + checklistTableId+ '">'+'<ul>'+jSelectElem.html()+'</ul></div></div>';
      var buttons='<input type="button" class="checklist-button" data-action="checkAll" value="All"/>' +
        '<input type="button" class="checklist-button" data-action="clearAll" value="None"/>' +
        '<input type="button" class="checklist-button" data-action="reset" value="Undo"/>' +
        '<div class="checklist-button showhide" data-action="toggleChecked"></div>' +
        '<div class="checklist-button showhide last" data-action="toggleUnchecked"></div>';
      var hidden='<input type="hidden" name="' + jSelectElemName + '" value="">';

      jSelectElem.replaceWith('<table id="' + checklistTableId + '" class=checklist><tr>' +
                              '<td class="buttons">' + buttons + '</td>' +
                              '<td class="list">' + hidden + div + '</td>' +
                              '</tr></table');

      $('#'+jSelectElemId).css('width',width);
      $("td:has('#"+jSelectElemId+"')").css('width',width);

      var checklistDivId='#'+checklistId;
      var table=$('#' + checklistTableId);
      var busy=table.busy || function (f) { f(); };

      $('input[type="button"]',table).click(function(e) {
        var action=$(this).data('action');

        busy.call(table,function() {
          updateChecklist(action,checklistDivId);
        });
      });

      $('.showhide',table).click(function(e) {
        var action=$(this).data('action');

        busy.call(table,function() {
          updateChecklist(action,checklistDivId);
        });
      });

      // We MUST set the checklist div's position to either 'relative' or 'absolute'
      // (default is 'static'), or else Firefox will think the offsetParent of the inner
      // elements is BODY instead of DIV.
      $(checklistDivId).css('position','relative');

      // Add the findInList div, if settings call for it.
      var findInListDivHeight = 0;

      if (o.addSearchBox) {
        $(checklistDivId).before('<div class="findInList" id="'+jSelectElemId+'_findInListDiv">' +
                                 '<input type="text" value="'+o.searchBoxText+'" id="' +
                                 jSelectElemId+'_findInList" class="'+o.cssBlurred+'" /></div>');

        // set width to same as original select element
        $('#'+jSelectElemId+'_findInListDiv').css('width',width);

        var findInList=$('#'+jSelectElemId+'_findInList');

        findInList.css('width',width);
        findInList.css('maxWidth',width);
        findInList.clearableTextField(function() {
          $(this).val(o.searchBoxText);
          $(this).blur();
        });

        findInList
          .bind('focus.focusSearchBox', function() {
            if (this.value == this.defaultValue) {
              this.value = "";
            }

            $(this).removeClass(o.cssBlurred);
          })
          .bind('blur.blurSearchBox', function() {
            if (this.value === '') {
              this.value = this.defaultValue;
            }

            $(this).addClass(o.cssBlurred);
          })
          .bind('keyup change paste cut', function(event) {
            var textbox = this; // holder

            if (this.value === '') {
              $('li',checklistDivId).each(function() {
                if ($(this).data('filtered')) {
                  $(this).removeData('filtered');
                }
              });

              $(this).unbind('keydown.tabToFocus');
              updateChecklist('setToggles',$(checklistDivId)[0]);
              return false;
            }

            var typedText = new RegExp(textbox.value,'i');

            $('li',checklistDivId).each(function() {
              $(this).removeData('filtered');

              if (!$(this).is(':disabled')) {
                var text=$(this).find('span').html();
                
                if (text.match(typedText) === null) {
                  $(this).data('filtered','1');
                }
              }
            });

            updateChecklist('setToggles',$(checklistDivId)[0]);
            return;
          });

        // Compensate for the extra space the search box takes up by shortening the
        // height of the checklist div. Also account for margin below the search box.
        findInListDivHeight = $('#'+jSelectElemId+'_findInListDiv').height() + 3;
      }

      // ============ Add styles =============
      $(checklistDivId).addClass(o.cssChecklist);

      if (o.addScrollBar) {
        $(checklistDivId).height(height - findInListDivHeight).width(width);
      }
      else {
        $(checklistDivId).height('100%').width(width);
      }

      $('ul',checklistDivId).addClass(o.cssChecklist);
      $('li:even',checklistDivId).addClass(o.cssEven);
      $('li:odd',checklistDivId).addClass(o.cssOdd);

      // ============ Event handlers ===========
      function moveToNextLi() {
        if ( $(this).is('li:has(input)') ) {
          $(this).focus();
        }
        else if ($(this).is('li')) {
          $(this).next().each(moveToNextLi);
        }
      }

      // Check/uncheck boxes
      function check(event,noSync) {
        // This needs to be keyboard accessible too. Only check the box if the user
        // presses space (enter typically submits a form, so is not safe).
        if (event.type == 'keydown') {
          // Pressing spacebar in IE and Opera triggers a Page Down. We don't want that
          // to happen in this case. Opera doesn't respond to this, unfortunately...
          // We also want to prevent form submission with enter key.
          if (event.keyCode == 32 || event.keyCode == 13) {
            event.preventDefault();
          }

          // Tab keys need to move to the next item in IE, Opera, Safari, Chrome, etc.
          if (event.keyCode == 9 && !event.shiftKey) {
            event.preventDefault();
            // Move to the next LI
            $(this).unbind('keydown.tabBack').blur().next().each(moveToNextLi);
          }
          else if (event.keyCode == 9 && event.shiftKey) {
            // Move to the previous LI
            //$(this).prev(':has(input)').focus();
          }

          if (event.keyCode != 32) {
            return;
          }
        }

        // toggle item
        if (!$(event.target).is('input')) {
          var input=$(this).find('input');

          if (input.attr('checked')) {
            input.removeAttr('checked');
          }
          else {
            input.attr('checked','checked');
          }
        }

        if (!noSync) {
          syncButtons($(checklistDivId));
        }
      }
      
      // Accessibility, primarily for IE
      function handFocusToLI() {
        // Make sure that labels and checkboxes that receive
        // focus divert the focus to the LI itself.
        $(this).parent().focus();
      }

      $('li:has(input)',checklistDivId).click(check).keydown(check);
      $('span',checklistDivId).focus(handFocusToLI);
      $('input',checklistDivId).focus(handFocusToLI);

      updateChecklist('setToggles',$(checklistDivId)[0]);
    });

    function setShowHide(checklistElem,checked,unchecked) {
      var id=$(checklistElem).attr('id');
      var shCheckedCookie= id + '_shChecked';
      var shUncheckedCookie= id + '_shUnchecked';

      $.cookie(shCheckedCookie,checked);
      $.cookie(shUncheckedCookie,unchecked);
    }

    function getShowHide(checklistElem) {
      var id=$(checklistElem).attr('id');
      var shCheckedCookie= id + '_shChecked';
      var shUncheckedCookie= id + '_shUnchecked';
      var shChecked=$.cookie(shCheckedCookie) || 'show';
      var shUnchecked=$.cookie(shUncheckedCookie) || 'show';

      return [ shChecked, shUnchecked ];
    }

    function toggleShowHide(checklistElem,action) {
      var id=$(checklistElem).attr('id');
      var cookie;

      if (action == 'toggleChecked') {
        cookie = id + '_shChecked';
      }
      else if (action == 'toggleUnchecked') {
        cookie = id + '_shUnchecked';
      }
      else {
        console.log('Unknown action to toggle');
      }

      // we default to showing if there's no cookie so set to show so that the toggle is hide
      var val=$.cookie(cookie) || 'show';

      if (val == 'hide') {
          val = 'show';
      }
      else {
        val = 'hide';
      }

      $.cookie(cookie,val);
    }

    function syncButtons(checklistElem) {
      //console.log('syncButtons');
      var needsReset=false;
      var someChecked=false;
      var someUnchecked=false;

      $('li:has(input)',checklistElem).each(function(i) {
        var li=$(this);
        var input=li.find('input');
        var checked=input.attr('checked') || false;
        var reset=input.data('reset') || false;
        
        if (!li.data('filtered') && (li.css('display') != 'none')) { // only affect things that are showing
          someChecked = someChecked || checked;
          someUnchecked = someUnchecked || !checked;
        }

        needsReset = needsReset || (reset != checked);
      });

      var table=$('#' + $(checklistElem).data('tableid'));
      var bAll=table.find('input[data-action="checkAll"]');
      var bNone=table.find('input[data-action="clearAll"]');
      var bReset=table.find('input[data-action="reset"]');

      bAll.attr('disabled',!someUnchecked);
      bNone.attr('disabled',!someChecked);
      bReset.attr('disabled',!needsReset);
    }

    // since o can be a string instead of an object, we need a function that
    // will handle the action requested when o is a string (e.g. 'clearAll')
    function updateChecklist(action,checklistElem) {
      //console.log('updateChecklist: ' + action);
      var selector;

      switch (action) {
      case 'clearAll':
        selector = 'li:has(input:checked)';
        break;

      case 'checkAll':
        selector = 'li:has(input:not(:checked,:disabled))';
        break;

      case 'reset':
        selector = 'li:has(input)';
        //setShowHide(checklistElem,'show','show');
        break;

      case 'resetResets':
        selector = 'li:has(input)';
        break;

      case 'setToggles':
        selector = 'li:has(input)';

        var shChecked=getShowHide(checklistElem);
        var shUnchecked=shChecked[1];
        shChecked = shChecked[0];
        
        var table=$('#' + $(checklistElem).data('tableid'));
        var bChecked=table.find('[data-action="toggleChecked"]');
        var bUnchecked=table.find('[data-action="toggleUnchecked"]');

        bChecked.html(((shChecked == 'show') ? 'Hide' : 'Show') + '&nbsp;<span>&#9745;</span>');
        bUnchecked.html(((shUnchecked == 'show') ? 'Hide' : 'Show') + '&nbsp;<span>&#9744;</span>');
        syncButtons(checklistElem);
        break;

      case 'toggleChecked':
      case 'toggleUnchecked':
        toggleShowHide(checklistElem,action);
        updateChecklist('setToggles',checklistElem);
        return;

      case 'syncButtons':
        syncButtons(checklistElem);
        return;

      default :
        alert("toChecklist Plugin\nUnknown action: " + action);
        break;
      }

      var nextOp=null;

      // if it's checked, force the click event handler to run.
      $(selector,checklistElem).each(function(i) {
        var li=$(this);
        var input=li.find('input');

        switch (action) {
        case 'setToggles':
          if (li.data('filtered')) {
            li.hide();
          }
          else if (input.attr('checked')) {
            li[shChecked]();
          }
          else {
            li[shUnchecked]();
          }

          nextOp = 'syncButtons';
          break;

        case 'reset':
          if (input.data('reset')) {
            input.attr('checked','checked');
          }
          else {
            input.removeAttr('checked');
          }

          nextOp = 'setToggles';
          break;

        case 'resetResets': // snapshot current state as the reset state
          if (input.attr('checked')) {
            input.data('reset','checked');
          }
          else {
            input.removeData('reset'); // remove from jquery
            input.removeAttr('data-reset'); // remove from DOM
            input.removeAttr('checked');
          }
          
          nextOp = 'syncButtons';
          break;

        default:
          if (!li.data('filtered') && (li.css('display') != 'none')) { // only affect things that are showing
            input.trigger('click',true);
          }

          nextOp = 'setToggles';
        }
      });

      if (nextOp) {
        updateChecklist(nextOp,checklistElem);
      }
    }
  };

  // Returns boolean value for the first matched element
  jQuery.fn.isChecklist=function() {
    var isChecklist=false;

    this.each(function() {
      isChecklist = (this.tagName == 'TABLE') && $(this).hasClass('checklist');
      return false;
    });

    return isChecklist;
  };
})(jQuery);
