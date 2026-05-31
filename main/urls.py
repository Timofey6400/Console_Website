from django.urls import path
from . import views
from .views import register_user, get_user_info

urlpatterns = [
    path('', views.home, name='home'),
    path('index/', views.home, name='index'),
    path('about/', views.about, name='about'),
    # API endpoints
    path('api/register/', register_user, name='register'),
    path('api/user-info/', get_user_info, name='user_info'),
    path('api/login/', views.login_user, name='login'),
    path('api/logout/', views.logout_user, name='logout'),
    path('api/get-packages/', views.get_installed_packages, name='get_packages'),
    path('api/install-package/', views.install_package, name='install_package'),
]