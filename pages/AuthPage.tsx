import React, { useState } from 'react';
import { signIn, signUp } from '../services/authService';

function AuthPage(): React.ReactNode {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLoginView) {
                await signIn(email, password);
            } else {
                await signUp(email, password);
                alert('Cadastro realizado! Por favor, verifique seu e-mail para confirmar sua conta.');
                setIsLoginView(true); // Switch to login view after successful signup
            }
            // The App component will detect the auth state change and redirect.
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <img src="https://koresolucoes.com.br/kore-logo.png" alt="Kore Soluções Logo" className="h-16 w-auto mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isLoginView ? 'Bem-vindo de volta!' : 'Crie sua conta'}
                    </h1>
                    <p className="text-gray-500">
                        {isLoginView ? 'Faça login para acessar seu painel.' : 'Preencha os campos para se cadastrar.'}
                    </p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                        {error}
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 mt-2 text-gray-800 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="text-sm font-medium text-gray-700">Senha</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 mt-2 text-gray-800 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                        >
                            {loading ? 'Carregando...' : (isLoginView ? 'Entrar' : 'Cadastrar')}
                        </button>
                    </div>
                </form>

                <p className="text-sm text-center text-gray-600">
                    {isLoginView ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                    <button
                        onClick={() => {
                            setIsLoginView(!isLoginView);
                            setError(null);
                        }}
                        className="ml-1 font-medium text-amber-600 hover:underline"
                    >
                        {isLoginView ? 'Cadastre-se' : 'Faça login'}
                    </button>
                </p>
            </div>
        </div>
    );
}

export default AuthPage;