from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token
import json
from django.views.decorators.http import require_POST
from django.core.exceptions import ObjectDoesNotExist

@csrf_exempt
@require_http_methods(["POST"])
def api_login(request):
    """API login endpoint for React frontend"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return JsonResponse({
                'error': 'Email and password are required'
            }, status=400)
        
        # Try to authenticate using email as username
        user = authenticate(request, username=email, password=password)
        # If that fails, try to look up a user with this email and authenticate with their username.
        # Multiple accounts can share the same email because Django's default User model does not
        # enforce uniqueness on the email field. Using `.get()` would therefore raise a
        # `MultipleObjectsReturned` exception and trigger a 500 response. Instead, attempt the first
        # matching user deterministically.
        if user is None:
            email_match = (
                User.objects
                .filter(email__iexact=email)
                .order_by('id')
                .first()
            )
            if email_match is not None:
                user = authenticate(request, username=email_match.username, password=password)
        
        if user is not None:
            login(request, user)
            return JsonResponse({
                'success': True,
                'user': {
                    'id': str(user.pk),
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name or '',
                    'last_name': user.last_name or '',
                    'is_active': user.is_active,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'created_at': user.date_joined.isoformat()
                },
                'session': {
                    'sessionid': request.session.session_key
                }
            })
        else:
            return JsonResponse({
                'error': 'Invalid credentials'
            }, status=401)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def api_logout(request):
    """API logout endpoint"""
    logout(request)
    return JsonResponse({'success': True})

@require_http_methods(["GET"])
def api_user(request):
    """Get current user information"""
    if request.user.is_authenticated:
        return JsonResponse({
            'user': {
                'id': str(request.user.pk),
                'email': request.user.email,
                'username': request.user.username,
                'first_name': request.user.first_name or '',
                'last_name': request.user.last_name or '',
                'is_active': request.user.is_active,
                'is_staff': request.user.is_staff,
                'is_superuser': request.user.is_superuser,
                'created_at': request.user.date_joined.isoformat()
            }
        })
    else:
        return JsonResponse({
            'error': 'Not authenticated'
        }, status=401)

@require_http_methods(["GET"])
def csrf_token(request):
    """Get CSRF token for frontend"""
    return JsonResponse({
        'csrfToken': get_token(request)
    })


@require_http_methods(["GET", "POST"])
def api_users(request):
    """List users (GET) or create a new user (POST). Staff only."""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'error': 'Forbidden'}, status=403)

    if request.method == 'GET':
        users = User.objects.all().order_by('email')
        users_list = []
        for u in users:
            users_list.append({
                'id': str(u.pk),
                'email': u.email,
                'username': u.username,
                'first_name': u.first_name or '',
                'last_name': u.last_name or '',
                'is_active': u.is_active,
                'is_staff': u.is_staff,
                'is_superuser': u.is_superuser,
                'created_at': u.date_joined.isoformat()
            })
        return JsonResponse({'users': users_list})

    # POST -> create user
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        is_staff = bool(data.get('is_staff'))
        is_superuser = bool(data.get('is_superuser'))

        if not email or not password:
            return JsonResponse({'error': 'email and password required'}, status=400)

        # Use email as username if available
        username = data.get('username') or email.split('@')[0]

        user = User.objects.create(username=username, email=email, is_active=True, is_staff=is_staff, is_superuser=is_superuser)
        user.set_password(password)
        user.save()

        return JsonResponse({'user': {
            'id': str(user.pk), 'email': user.email,
            'is_active': user.is_active, 'is_staff': user.is_staff, 'is_superuser': user.is_superuser
        }}, status=201)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET", "PATCH", "DELETE"])
def api_user_detail(request, id):
    """Get, update or delete a single user by id (staff only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'error': 'Forbidden'}, status=403)

    try:
        user = User.objects.get(pk=id)
    except ObjectDoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    # Prevent a user from changing or deleting their own elevated flags or deleting themselves
    is_self = False
    try:
        is_self = str(request.user.pk) == str(user.pk)
    except Exception:
        is_self = False

    if request.method == 'GET':
        return JsonResponse({'user': {
            'id': str(user.pk), 'email': user.email, 'username': user.username,
            'first_name': user.first_name or '', 'last_name': user.last_name or '',
            'is_active': user.is_active, 'is_staff': user.is_staff, 'is_superuser': user.is_superuser,
            'created_at': user.date_joined.isoformat()
        }})

    if request.method == 'PATCH':
        try:
            data = json.loads(request.body)
            # Prevent self-modification of critical flags unless confirm_password is provided and valid
            if is_self and ('is_staff' in data or 'is_superuser' in data or 'is_active' in data):
                confirm_pw = data.get('confirm_password')
                if not confirm_pw:
                    return JsonResponse({'error': 'confirm_password required to change own elevated flags'}, status=403)
                # Verify password
                from django.contrib.auth import authenticate as dj_authenticate
                auth_user = dj_authenticate(request, username=request.user.username, password=confirm_pw)
                if auth_user is None:
                    return JsonResponse({'error': 'confirm_password does not match'}, status=403)

            # Allow toggling flags and updating names/email
            if 'email' in data:
                user.email = data.get('email')
            if 'username' in data:
                user.username = data.get('username') or user.username
            if 'first_name' in data:
                user.first_name = data.get('first_name') or ''
            if 'last_name' in data:
                user.last_name = data.get('last_name') or ''
            if 'is_active' in data:
                user.is_active = bool(data.get('is_active'))
            if 'is_staff' in data:
                user.is_staff = bool(data.get('is_staff'))
            if 'is_superuser' in data:
                user.is_superuser = bool(data.get('is_superuser'))
            if 'password' in data and data.get('password'):
                user.set_password(data.get('password'))

            user.save()
            return JsonResponse({'success': True})
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    if request.method == 'DELETE':
        try:
            if is_self:
                return JsonResponse({'error': 'Cannot delete your own account via admin API'}, status=403)

            user.delete()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


# ============================================================================
# SAML SSO Support Functions (for production deployment)
# ============================================================================

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def login_info(request):
    """
    Provides login information based on environment
    In production: provides both SAML SSO and local admin login
    In development: allows local authentication
    PUBLIC ENDPOINT - No authentication required
    """
    if settings.DEBUG:
        # Development mode - use local auth
        return Response({
            'method': 'local',
            'login_url': '/api/auth/login/',
            'saml_enabled': False,
            'environment': 'development',
            'message': 'Development mode: Use local authentication'
        })
    else:
        # Production mode - provide both options
        return Response({
            'method': 'hybrid',
            'saml_login_url': '/saml/login/',
            'local_login_url': '/api/auth/local-login/',
            'saml_enabled': True,
            'local_enabled': True,
            'environment': 'production',
            'provider': 'Chalmers University',
            'message': 'Login with Chalmers SSO or admin credentials'
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def current_user(request):
    """
    Returns current authenticated user information
    """
    if request.user.is_authenticated:
        return Response({
            'authenticated': True,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'is_staff': request.user.is_staff,
            'is_superuser': request.user.is_superuser,
            'full_name': request.user.get_full_name() or request.user.username,
        })
    else:
        return Response({
            'authenticated': False,
        })


@csrf_exempt
@require_http_methods(["POST"])
def local_login(request):
    """
    Local authentication endpoint
    In production: Allow admin/staff users to login (temporary for testing)
    In development: Allow all users
    Supports both username and email-based login
    """
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return JsonResponse({
                'error': 'Username and password required'
            }, status=400)
        
        # Try to authenticate using username directly
        user = authenticate(request, username=username, password=password)
        
        # If that fails, try to look up a user with this email and authenticate with their username
        if user is None:
            email_match = (
                User.objects
                .filter(email__iexact=username)
                .order_by('id')
                .first()
            )
            if email_match is not None:
                user = authenticate(request, username=email_match.username, password=password)
        
        if user is not None:
            # In production, only allow staff/admin users
            if not settings.DEBUG and not (user.is_staff or user.is_superuser):
                return JsonResponse({
                    'error': 'Local login restricted to admin users in production',
                    'message': 'Please use Chalmers SSO or contact administrator'
                }, status=403)
            
            login(request, user)
            logger.info(f"User logged in: {username}")
            return JsonResponse({
                'success': True,
                'user': {
                    'id': user.pk,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name or '',
                    'last_name': user.last_name or '',
                    'full_name': user.get_full_name() or user.username,
                    'is_active': user.is_active,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'date_joined': user.date_joined.isoformat(),
                }
            })
        else:
            logger.warning(f"Failed login attempt: {username}")
            return JsonResponse({
                'error': 'Invalid credentials'
            }, status=401)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON'
        }, status=400)


@require_http_methods(["POST", "GET"])
def logout_view(request):
    """
    Logout endpoint
    Handles both local logout and SAML SLO (Single Logout)
    """
    if request.user.is_authenticated:
        username = request.user.username
        logout(request)
        logger.info(f"User logged out: {username}")
        
        # In production with SAML, redirect to SAML SLO
        if not settings.DEBUG:
            return JsonResponse({
                'success': True,
                'message': 'Logged out',
                'redirect': '/saml/logout/'
            })
    
    return JsonResponse({
        'success': True,
        'message': 'Logged out'
    })
