"""Custom authentication backends for EPSM production deployment."""
import logging
from typing import Any, Dict

from django.conf import settings
from django.utils.module_loading import import_string

from djangosaml2.backends import Saml2Backend

logger = logging.getLogger(__name__)


class CustomSaml2Backend(Saml2Backend):
    """Wrap the default SAML backend to invoke an optional attribute callback."""

    def authenticate(self, request, **kwargs):
        logger.info("CustomSaml2Backend.authenticate called")
        return super().authenticate(request, **kwargs)

    def _update_user(
        self,
        user,
        attributes: Dict[str, Any],
        attribute_mapping: Dict[str, Any],
        force_save: bool = False,
    ):
        """Run the standard update pipeline and then invoke the configured hook."""
        user = super()._update_user(user, attributes, attribute_mapping, force_save)

        callback_path = getattr(settings, "SAML_ATTRIBUTE_MAPPING_CALLBACK", None)
        if not callback_path:
            return user

        try:
            logger.info("Importing SAML attribute callback: %s", callback_path)
            callback = import_string(callback_path)
        except (ImportError, AttributeError) as exc:
            logger.exception("Failed to import SAML attribute callback %s", callback_path)
            return user

        try:
            logger.info(
                "Calling SAML attribute callback: %s for user=%s",
                callback_path,
                getattr(user, "username", None),
            )
            updated_user = callback(user, attributes, attribute_mapping)
            logger.info(
                "Callback %s completed for user=%s",
                callback_path,
                getattr(updated_user, "username", None),
            )
        except Exception:  # pragma: no cover - defensive logging for production
            logger.exception("SAML attribute callback %s raised an exception", callback_path)
            return user

        if updated_user is None:
            updated_user = user

        if force_save and updated_user.pk is None:
            updated_user = self.save_user(updated_user)

        return updated_user
