var queryStr = window.location.search,
      currentRequestModify = 'api.php',
      forms = document.forms,
      formLength = forms.length,
      i;
        
    if(formLength > 0) {
      for(i = 0; i < formLength; i++) {
        var form = forms[i];
        form.action = currentRequestModify + queryStr;
        if (name = form.name)
            name.required = true;

        if (phone = form.phone)
            phone.required = true;

        if (country = form.country)
            country.style.display = "none";
      }
    }