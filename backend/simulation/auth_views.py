from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token
import json

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
        # If that fails, try to look up a user with this email and authenticate with their username
        if user is None:
            try:
                u = User.objects.get(email__iexact=email)
                user = authenticate(request, username=u.username, password=password)
            except User.DoesNotExist:
                user = None
        
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