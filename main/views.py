from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth import login, authenticate
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import logout
from .models import UserProfile
import json

@csrf_exempt
def register_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')

            if len(password) < 6:
                return JsonResponse({'status': 'error', 'message': 'Password must be at least 6 characters'}, status=400)

            if User.objects.filter(username=username).exists():
                return JsonResponse({'status': 'error', 'message': 'User already exists'}, status=400)

            user = User.objects.create_user(username=username, password=password)
            UserProfile.objects.create(user=user)
            login(request, user)
            
            return JsonResponse({'status': 'success', 'username': user.username})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def login_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                login(request, user)
                return JsonResponse({'status': 'success', 'username': user.username})
            else:
                return JsonResponse({'status': 'error', 'message': 'Invalid username or password'}, status=401)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

def get_user_info(request):
    return JsonResponse({
        'is_authenticated': request.user.is_authenticated,
        'username': request.user.username if request.user.is_authenticated else 'guest'
    })

@csrf_exempt
def logout_user(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=405)

def get_installed_packages(request):
    """Возвращает пакеты юзера. Если профиля нет — создаем его"""
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'success', 'packages': []})
        
    # Безопасное получение или создание профиля, если юзер старый
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    packages = json.loads(profile.installed_packages)
    return JsonResponse({'status': 'success', 'packages': packages})

def install_package(request):
    """Сохраняет пакет в БД с автоматическим созданием профиля для старых аккаунтов"""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
        
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Anonymous users cannot save packages'}, status=401)
        
    try:
        data = json.loads(request.body)
        package_name = data.get('package', '').lower().strip()
        
        if not package_name:
            return JsonResponse({'status': 'error', 'message': 'Package name is required'}, status=400)
            
        # Заменяем request.user.profile на безопасный get_or_create
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        packages = json.loads(profile.installed_packages)
        
        if package_name not in packages:
            packages.append(package_name)
            profile.installed_packages = json.dumps(packages)
            profile.save()
            
        return JsonResponse({'status': 'success', 'packages': packages})
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)

def home(request):
    return render(request, 'index.html')

def about(request):
    return render(request, 'about.html')