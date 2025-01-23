var signupConfiguration; /** declaring it globally */
(function ($) {
	$(document).ready(function () {
		var passwordComplexTemplate = `<div class="pass-template shadow-sm  p-1"><small class="d-block"><i class="v1 fas fa-times mx-1"></i>Uppercase</small><small class="d-block"><i class="v2 fas fa-times mx-1"></i>Lowercase</small><small class="d-block"><i class="v3 fas fa-times mx-1"></i>Number</small><small class="d-block"><i class="v4 fas fa-times mx-1"></i>Special chars</small><small class="d-block"><i class="v5 fas fa-times mx-1"></i>Min 8 chars</small></div>`;
		const $configParagraph = $('#extension_CustomConfig');
		const jsonString = $configParagraph.text().trim();

		if (!jsonString) return; // No config, bail out

		// Parse the JSON config
		signupConfiguration = JSON.parse(jsonString);
		$configParagraph.remove();

		// Ensure necessary properties exist
		if (!signupConfiguration.title || !signupConfiguration.claims) return;

		// Initialize UI
		$('#co-main-container').show();
		hideAzureDefaultElements();
		setPageTitleAndLogo(signupConfiguration);
		toggleClaimsVisibility(signupConfiguration.claims);
		handleTermsOfUse(signupConfiguration.claims, signupConfiguration.tou);
		initializeFields(signupConfiguration.claims, signupConfiguration.tou);
		setupFormSubmission(signupConfiguration.claims, signupConfiguration.tou);
		showPageContent();
		focusEmailField();
		$('#continue').show();


		$(".password_li").append(passwordComplexTemplate)

		//$(passwordComplexTemplate).insertAfter("#reenterPassword")
		$('.pass-template').hide();

		$('#password').on('focus', function () {
			// debugger;
			$('.pass-template').show();
			$('.pass-template').css('left', $(this).offset().left < 180 ? $(this).width() + 85 : -150)
			checkPasswordComplexity($(this).val())
		});

		$('#password').on('blur', function () {
			// Password complexity check
			const value = $("#password").val()
			const trimmedValue = (value || "").trim();
			if (trimmedValue.length !== 0) {
				const passwordIsValid = checkPasswordComplexity(trimmedValue);
				if (!passwordIsValid) {
					const $errorEl = $('#password').siblings('.error');
					showError($errorEl, 'Please use the complex password.');
					return false;
				}
			}
			$('.pass-template').hide();
		});

		$('#password').on('input', function () {
			checkPasswordComplexity($(this).val())
		});

		/* given name and surname handling */
		$('#displayName').on('input', function () {
			var sp = $(this).val().split(' ')

			$('#givenName').val(sp[0])
			$('#surname').val($(this).val().replace(sp[0], "").trim());
		});

	});

	/** password complexity check */
	function checkPasswordComplexity(txt) {
		if (txt.length !== 0) {
			var v1 = txt.match(/[A-Z]/g) !== null;
			var v2 = txt.match(/[a-z]/g) !== null;
			var v3 = txt.match(/\d/g) !== null;
			var v4 = txt.match(/[!@#$%^&*(),.?":{}|<>]/g) !== null;
			var v5 = txt.length > 7;
			var validPassword = v5 && v1 && v2 && v3 && v4;

			$('.v1, .v2, .v3 , .v4 , .v5').removeClass('fa-times').removeClass('fa-check').removeClass('text-danger').removeClass('text-success');
			$('.v1').addClass(v1 ? 'fa-check text-success' : 'fa-times text-danger');
			$('.v2').addClass(v2 ? 'fa-check text-success' : 'fa-times text-danger');
			$('.v3').addClass(v3 ? 'fa-check text-success' : 'fa-times text-danger');
			$('.v4').addClass(v4 ? 'fa-check text-success' : 'fa-times text-danger');
			$('.v5').addClass(v5 ? 'fa-check text-success' : 'fa-times text-danger');
			$('.pass-template').removeClass('d-none').removeClass('b-success').removeClass('b-danger').addClass(validPassword ? 'b-success' : 'b-danger')
			return validPassword;
		} else {
			$('.pass-template').addClass('d-none')
		}
	}


	/**
	 * Hides the default Azure AD B2C elements like: help link 
	 */
	function hideAzureDefaultElements() {
		$('a.helpLink').hide();
	}

	/**
	 * Sets the logo, main title, and subtitle text from configuration
	 */
	function setPageTitleAndLogo(config) {
		$('#logo').attr('src', config.logo);
		$('#title').text(config.title);
		$('#subtitle').text(config.subtitle);
	}

	/**
	 * Shows only the claims that are configured; hides everything else
	 */
	function toggleClaimsVisibility(claims) {
		const allowedClaims = claims.map(claim => claim.id);

		$("#attributeList li").each(function () {
			const claimId = $(this).find("input, select").attr("id");
			// Show if claim is in allowed list, otherwise hide
			$(this).toggle(claimId && allowedClaims.includes(claimId));
		});
	}

	/**
	 * Checks if terms of use (TOU) is configured; if so, displays and links to it
	 */
	function handleTermsOfUse(claims, tou) {
		const $acceptTermsLi = $("#extension_AcceptTerms_true").closest(".CheckboxMultiSelect");

		if (!tou) {
			// No TOU in config => hide checkbox
			$acceptTermsLi.hide();
			return;
		}

		// TOU present => update label with link
		const $termsLabel = $('#extension_AcceptTerms_true').next('label#true_option');
		const existingText = $termsLabel.text();
		$termsLabel.html(`
            ${existingText}
            <a href="${tou.document}" target="_blank">
                ${tou.label}
            </a>
        `);

		$acceptTermsLi.show();

		// Validate the TOU checkbox on change
		$('#extension_AcceptTerms_true').on('change', function () {
			//debugger;
			const $touError = $(this).closest('li').find('.error');

			if ($(this).is(':checked')) {
				// Clear error if checked
				clearError($touError);
			} else if (tou.required) {
				// Show error if unchecked & required
				showError($touError, 'You must accept the Terms and Privacy to continue.');
			}

			toggleContinueButton(claims, tou);
		});
	}

	/**
	 * Sets up dynamic handling for each field (e.g., populates dropdowns, attaches validation)
	 */
	function initializeFields(fields, tou) {
		fields.forEach(field => {
			const $fieldEl = $(`#${field.id}`);

			// Populate dropdown options if needed
			if (field.options?.length > 0) {
				setupDropdown($fieldEl, field.options);
			}

			// Validate on change/input/blur
			$fieldEl.on('change input blur', function () {
				//debugger;
				validateField(field, $(this).val());
				toggleContinueButton(fields, tou);
			});
		});

		// Disable the Continue button initially
		$('#continue').prop('disabled', true);
	}

	/**
	 * Sets up dropdown options
	 */
	function setupDropdown($dropdown, options) {
		$dropdown.empty()
			.append('<option value="">Select an option</option>');
		options.forEach(opt => {
			$dropdown.append(`<option value="${opt.value}">${opt.text}</option>`);
		});
	}

	/**
	 * Handles final form submission, including validation checks
	 */
	function setupFormSubmission(fields, tou) {
		$('#continue').on('click', function (e) {
			e.preventDefault();

			let allValid = true;

			// Validate each configured field
			fields.forEach(field => {
				const value = $(`#${field.id}`).val();
				if (!validateField(field, value)) {
					allValid = false;
				}
			});

			// Check TOU if required
			if (tou && tou.required) {
				const isTouChecked = $('#extension_AcceptTerms_true').is(':checked');
				const $touError = $('#extension_AcceptTerms_true').closest('li').find('.error');

				if (!isTouChecked) {
					allValid = false;
					showError($touError, 'You must accept the Terms and Privacy to continue.');
				} else {
					clearError($touError);
				}
			}

			// Submit if everything is valid
			if (allValid) {
				$('#attributeVerification').off('submit').submit();
			}
		});
	}

	/**
	 * Toggles the Continue button based on required fields and TOU checkbox
	 */
	function toggleContinueButton(fields, tou) {
		let formIsValid = fields.every(field => {
			const value = $(`#${field.id}`).val() || "";
			return !field.required || value.trim() !== "";
		});

		// If TOU is required, ensure it's checked
		if (tou && tou.required) {
			formIsValid = formIsValid && $('#extension_AcceptTerms_true').is(':checked');
		}

		$('#continue').prop('disabled', !formIsValid);
	}

	/**
	 * Validates a single field (basic checks: required, email pattern if type=email)
	 */
	function validateField(field, value) {
		const $errorEl = $(`#${field.id}`).siblings('.error');
		const trimmedValue = (value || "").trim();

		// Required check
		if (field.required && !trimmedValue) {
			showError($errorEl, `${field.fieldLabel} is required.`);
			return false;
		}

		// Type-based checks (email pattern)
		if (field.type === 'email' && trimmedValue) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(trimmedValue)) {
				showError($errorEl, 'Please enter a valid email address.');
				return false;
			}
		}



		// If valid, clear errors
		clearError($errorEl);
		return true;
	}

	/**
	 * Displays an error message
	 */
	function showError($element, message) {
		$element
			.text(message)
			.addClass('show')
			.attr('aria-hidden', 'false');
	}

	/**
	 * Clears a displayed error
	 */
	function clearError($element) {
		$element
			.text('')
			.removeClass('show')
			.attr('aria-hidden', 'true');
	}

	/**
	 * Reveals the main container/body
	 */
	function showPageContent() {
		$("body").show();
		$("#api_container").show();
		$("#co-main-container").show();
	}

	/**
	 * Focuses on the email field if present
	 */
	function focusEmailField() {
		const $emailField = $('#email');
		if ($emailField.length) $emailField.focus();
	}
})(jQuery);